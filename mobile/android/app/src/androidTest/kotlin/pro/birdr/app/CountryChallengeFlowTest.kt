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
        waitForView(withContentDescription("Country challenge"), 10_000)

        // Navigate to Country challenge from Home
        onView(withContentDescription("Country challenge"))
            .perform(click())

        // Assert we're on the Challenge screen (title or key form elements)
        onView(withContentDescription("Country challenge"))
            .check(matches(isDisplayed()))

        // Wait for form to be ready (Challenge screen may still be loading)
        waitForView(withContentDescription("Select country"), 15_000)

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
     * (loading, "Start Level", "Round", or play screen). Handles persisted state: if level intro
     * is already visible (from previous run), tap "Start Level" instead of filling the form.
     */
    @Test
    fun startChallengeButton_leadsToNextState() {
        waitForView(withText("Welcome"), 30_000)
        waitForView(withContentDescription("Country challenge"), 10_000)

        onView(withContentDescription("Country challenge"))
            .perform(click())

        // Wait for Challenge screen to load: form ("Select country") or level intro ("Start Level"). Allow time for loadCountryChallenge.
        waitForAnyOf(
            listOf(
                withContentDescription("Select country"),
                withContentDescription("Start Level"),
                withText("Start Level"),
                withText("Country challenge")
            ),
            15_000
        )
        // If we only see the title, wait a bit more for form or level intro
        if (!isViewDisplayed(withContentDescription("Select country")) && !isViewDisplayed(withContentDescription("Start Level"))) {
            waitForAnyOf(
                listOf(
                    withContentDescription("Select country"),
                    withContentDescription("Start Level"),
                    withText("Start Level")
                ),
                10_000
            )
        }

        // If we see the form, fill it and tap "Start challenge"
        if (isViewDisplayed(withContentDescription("Select country"))) {
            onView(withContentDescription("Your name"))
                .perform(typeText("TestUser"), closeSoftKeyboard())
            onView(withContentDescription("Select country"))
                .perform(click())
            waitForView(withText("Select country"), 3_000)
            tapFirstVisibleOf(listOf("Netherlands", "United States", "United Kingdom", "Albania"))
            onView(withContentDescription("Start challenge"))
                .perform(click())
        } else {
            // Level intro already visible — tap "Start Level"
            tryTap(withContentDescription("Start Level")) || tryTap(withText("Start Level"))
        }

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
     * Test 3: Full country challenge cycle – start challenge, answer 3 questions then stop.
     * Handles persisted state: if level intro is visible, tap "Start Level" first. In the loop,
     * taps "Start Level" when moving to the next level.
     */
    @Test
    fun startChallenge_fullCycle_answer3Questions() {
        waitForView(withText("Welcome"), 30_000)
        // Ensure home is fully rendered so "Country challenge" is present before clicking
        waitForView(withContentDescription("Country challenge"), 10_000)

        onView(withContentDescription("Country challenge"))
            .perform(click())

        // Wait for either create form or level intro (Challenge screen may load slowly)
        waitForAnyOf(
            listOf(
                withContentDescription("Select country"),
                withContentDescription("Start Level"),
                withText("Start Level"),
                withText("Country challenge")
            ),
            15_000
        )
        if (!isViewDisplayed(withContentDescription("Select country")) && !isViewDisplayed(withContentDescription("Start Level"))) {
            waitForAnyOf(
                listOf(
                    withContentDescription("Select country"),
                    withContentDescription("Start Level"),
                    withText("Start Level")
                ),
                10_000
            )
        }

        if (isViewDisplayed(withContentDescription("Select country"))) {
            // Wait for full form (Start challenge button) to be visible; may need scroll on small screens
            if (!waitForViewOrNull(withContentDescription("Start challenge"), 15_000)) {
                // Form not ready in time; might be level intro instead
                tryTap(withContentDescription("Start Level")) || tryTap(withText("Start Level"))
            } else {
                onView(withContentDescription("Your name"))
                    .perform(typeText("ChallengeUser"), closeSoftKeyboard())
                onView(withContentDescription("Select country"))
                    .perform(click())
                waitForView(withText("Select country"), 3_000)
                tapFirstVisibleOf(listOf("Netherlands", "United States", "United Kingdom", "Albania"))
                onView(withContentDescription("Start challenge"))
                    .perform(click())
            }
        } else {
            tryTap(withContentDescription("Start Level")) || tryTap(withText("Start Level"))
        }

        // Wait for first question (or level intro or back to challenge on error)
        waitForAnyOf(
            listOf(
                withContentDescription("First answer option"),
                withContentDescription("Loading question…"),
                withText("Loading question…"),
                withText("Start Level"),
                withContentDescription("Start Level"),
                withContentDescription("Select country")
            ),
            35_000
        )

        // If we're on level intro, tap "Start Level" to enter the level
        tryTap(withContentDescription("Start Level")) || tryTap(withText("Start Level"))

        var answered = 0
        while (answered < 3) {
            // If we're back on Challenge screen, level ended
            if (isViewDisplayed(withContentDescription("Select country")) && isViewDisplayed(withContentDescription("Start challenge"))) {
                return
            }
            // If we're on level intro, tap to continue
            if (tryTap(withContentDescription("Start Level")) || tryTap(withText("Start Level"))) {
                Thread.sleep(500)
                continue
            }
            // Answer: tap first option
            if (tryTap(withContentDescription("First answer option"))) {
                answered++
                // Wait for "Next question" or "End level" (no auto-advance)
                waitForAnyOf(
                    listOf(
                        withContentDescription("Next question"),
                        withContentDescription("End level"),
                        withText("Next question"),
                        withText("End level"),
                        withText("Volgende vraag"),
                        withText("Level beëindigen")
                    ),
                    20_000
                )
                if (tryTap(withContentDescription("End level")) || tryTap(withText("End level")) || tryTap(withText("Level beëindigen")))
                    break
                val nextTapped = tryTap(withContentDescription("Next question")) || tryTap(withText("Next question")) || tryTap(withText("Volgende vraag"))
                if (!nextTapped) throw AssertionError("Next question button not found after answer")
            }
            // Wait for next question or loading or back to challenge or next level intro
            try {
                waitForAnyOf(
                    listOf(
                        withContentDescription("First answer option"),
                        withText("Loading question…"),
                        withContentDescription("Select country"),
                        withContentDescription("Start Level"),
                        withText("Start Level")
                    ),
                    22_000
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

    /** Returns true if the view is currently displayed. */
    private fun isViewDisplayed(matcher: org.hamcrest.Matcher<android.view.View>): Boolean {
        return try {
            onView(matcher).check(matches(isDisplayed()))
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
