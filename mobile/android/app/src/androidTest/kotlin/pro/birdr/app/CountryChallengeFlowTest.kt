package pro.birdr.app

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.CoreMatchers.allOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Espresso UI tests for the Country challenge flow.
 * Run with: cd mobile/android && ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class CountryChallengeFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test 1: Navigate to Country challenge, assert screen, open/close country and language modals,
     * assert "Start challenge" is present.
     */
    @Test
    fun countryChallengeScreen_andModals_startChallengeVisible() {
        // Wait for Home to load (React Native bundle)
        waitForView(withText("Welcome"), 30_000)

        // Navigate to Country challenge from Home
        onView(withContentDescription("Country challenge"))
            .perform(click())

        // Assert we're on the Challenge screen (title or key form elements)
        onView(withContentDescription("Country challenge"))
            .check(matches(isDisplayed()))

        // Tap "Select country" and assert modal appears
        onView(withContentDescription("Select country"))
            .perform(click())
        onView(withText("Select country"))
            .check(matches(isDisplayed()))
        onView(withText("Close"))
            .perform(click())
        // Wait for country modal to dismiss and Challenge screen to show (modal animation can be slow)
        waitForView(withContentDescription("Select language"), 8_000)
        // Tap "Select language" and assert language modal appears
        onView(withContentDescription("Select language"))
            .perform(click())
        onView(withText("Select language"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close"))
            .perform(click())

        // Assert "Start challenge" is present
        onView(withContentDescription("Start challenge"))
            .check(matches(isDisplayed()))
    }

    /**
     * Test 2: Fill name, select country, tap "Start challenge", assert next state appears
     * (loading, "Start Level", "Round", or play screen). Fails if the button does nothing.
     */
    @Test
    fun startChallengeButton_leadsToNextState() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Country challenge"))
            .perform(click())

        waitForView(withContentDescription("Select country"), 5_000)

        // Fill name
        onView(withContentDescription("Your name"))
            .perform(typeText("TestUser"), closeSoftKeyboard())

        // Select country: open modal and tap a country (by displayed name; list comes from API)
        onView(withContentDescription("Select country"))
            .perform(click())
        waitForView(withText("Select country"), 3_000)
        // Tap a country (API-dependent; try common names that many backends return)
        tapFirstVisibleOf(listOf("Netherlands", "United States", "United Kingdom", "Albania"))

        // Tap "Start challenge"
        onView(withContentDescription("Start challenge"))
            .perform(click())

        // Assert something visible changed: either loading, level intro, or play screen
        waitForAnyOf(
            listOf(
                withContentDescription("Start Level"),
                withContentDescription("Restart Level"),
                withContentDescription("Continue"),
                withText("Start Level"),
                withText("What is this level about?"),
                withText("Loading question…")
            ),
            15_000
        )
    }

    private fun waitForView(matcher: org.hamcrest.Matcher<android.view.View>, timeoutMs: Long) {
        val start = System.currentTimeMillis()
        var lastError: Exception? = null
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                onView(matcher).check(matches(isDisplayed()))
                return
            } catch (e: Exception) {
                lastError = e
                Thread.sleep(300)
            }
        }
        throw lastError ?: AssertionError("View not found within ${timeoutMs}ms")
    }

    private fun waitForAnyOf(
        matchers: List<org.hamcrest.Matcher<android.view.View>>,
        timeoutMs: Long
    ) {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            for (m in matchers) {
                try {
                    onView(m).check(matches(isDisplayed()))
                    return
                } catch (_: Exception) { }
            }
            Thread.sleep(300)
        }
        throw AssertionError("None of the expected views appeared within ${timeoutMs}ms")
    }

    private fun tapFirstVisibleOf(countryNames: List<String>) {
        for (name in countryNames) {
            try {
                onView(allOf(withText(name), isDisplayed())).perform(click())
                return
            } catch (_: Exception) { }
        }
        throw AssertionError("No country found from list: $countryNames")
    }
}
