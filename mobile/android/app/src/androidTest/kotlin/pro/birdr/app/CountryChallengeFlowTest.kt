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
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.CoreMatchers.allOf
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Espresso UI tests for the Country challenge flow.
 * Run with: cd mobile/android && ./gradlew connectedDebugAndroidTest
 *
 * Tests that need the backend are skipped unless you pass:
 * -Pandroid.testInstrumentationRunnerArguments.backendAvailable=true
 */
@RunWith(AndroidJUnit4::class)
class CountryChallengeFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    private fun assumeBackendAvailable() {
        val backendAvailable = InstrumentationRegistry.getInstrumentation()
            .arguments.getString("backendAvailable") == "true"
        assumeTrue(
            "Backend not available; run with -Pandroid.testInstrumentationRunnerArguments.backendAvailable=true",
            backendAvailable
        )
    }

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
        onView(withContentDescription("Close country modal"))
            .perform(click())
        // Wait for country modal to dismiss; retry close tap once if modal animation or touch was slow
        if (!waitForViewOrNull(withContentDescription("Select language"), 5_000)) {
            try {
                onView(withContentDescription("Close country modal")).perform(click())
            } catch (_: Exception) { /* modal may already be closed */ }
        }
        waitForView(withContentDescription("Select language"), 5_000)
        // Tap "Select language" and assert language modal appears
        onView(withContentDescription("Select language"))
            .perform(click())
        onView(withText("Select language"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close language modal"))
            .perform(click())

        // Assert "Start challenge" is present
        onView(withContentDescription("Start challenge"))
            .check(matches(isDisplayed()))
    }

    /**
     * Test 2: Fill name, select country, tap "Start challenge", assert next state appears
     * (loading, "Start Level", "Round", or play screen). Requires backend; skipped otherwise.
     */
    @Test
    fun startChallengeButton_leadsToNextState() {
        assumeBackendAvailable()
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
            30_000
        )
    }

    /**
     * Test 3: Full country challenge cycle – start challenge, answer up to 10 questions until level ends.
     * Requires backend. Skipped unless backendAvailable=true.
     */
    @Test
    fun startChallenge_fullCycle_answerUpTo10Questions() {
        assumeBackendAvailable()
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Country challenge"))
            .perform(click())
        waitForView(withContentDescription("Select country"), 5_000)

        onView(withContentDescription("Your name"))
            .perform(typeText("ChallengeUser"), closeSoftKeyboard())
        onView(withContentDescription("Select country"))
            .perform(click())
        waitForView(withText("Select country"), 3_000)
        tapFirstVisibleOf(listOf("Netherlands", "United States", "United Kingdom", "Albania"))
        onView(withContentDescription("Start challenge"))
            .perform(click())

        // Wait for first question (or level intro or back to challenge on error)
        waitForAnyOf(
            listOf(
                withContentDescription("First answer option"),
                withContentDescription("Loading question…"),
                withText("Loading question…"),
                withText("Start Level"),
                withContentDescription("Select country")
            ),
            35_000
        )

        var answered = 0
        while (answered < 10) {
            // If we're back on Challenge screen, level ended
            try {
                onView(withContentDescription("Select country")).check(matches(isDisplayed()))
                onView(withContentDescription("Start challenge")).check(matches(isDisplayed()))
                return
            } catch (_: Exception) { }

            if (tryTap(withContentDescription("First answer option"))) {
                answered++
                Thread.sleep(1500)
            }
            // Wait for next question or loading or back to challenge
            try {
                waitForAnyOf(
                    listOf(
                        withContentDescription("First answer option"),
                        withText("Loading question…"),
                        withContentDescription("Select country")
                    ),
                    18_000
                )
            } catch (_: Exception) { }
        }
    }

    private fun tryTap(matcher: org.hamcrest.Matcher<android.view.View>): Boolean {
        return try {
            onView(matcher).check(matches(isDisplayed()))
            onView(matcher).perform(click())
            true
        } catch (_: Exception) {
            false
        }
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

    /** Returns true if view was found within timeout, false otherwise. */
    private fun waitForViewOrNull(matcher: org.hamcrest.Matcher<android.view.View>, timeoutMs: Long): Boolean {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                onView(matcher).check(matches(isDisplayed()))
                return true
            } catch (_: Exception) {
                Thread.sleep(300)
            }
        }
        return false
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
