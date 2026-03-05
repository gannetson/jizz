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
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Espresso UI tests for the normal (multiplayer) game flow.
 * Run with: cd mobile/android && ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class NormalGameFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Test 1: Home → Start screen. Tap "Start a new game", assert Start screen title and form elements.
     */
    @Test
    fun normalGame_homeToStartScreen() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Start a new game"))
            .perform(click())

        // Wait for Start screen to load (React Native may still be loading)
        waitForView(withContentDescription("Select country"), 15_000)

        onView(withContentDescription("Player name"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Select country"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Start a new game"))
            .check(matches(isDisplayed()))
    }

    /**
     * Test 2: On Start screen, open country modal (assert "Select country"), close; open language modal, close; assert Start button present.
     */
    @Test
    fun normalGame_startScreenModals_startButtonVisible() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Start a new game"))
            .perform(click())

        // Wait for Start screen form to load
        waitForView(withContentDescription("Select country"), 15_000)

        onView(withContentDescription("Select country"))
            .perform(click())
        waitForView(withText("Select country"), 5_000)
        onView(withText("Select country"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close"))
            .perform(click())
        // Wait for country modal to dismiss (animation); then "Select language" becomes findable
        waitForView(withContentDescription("Select language"), 8_000)
        onView(withContentDescription("Select language"))
            .perform(click())
        onView(withText("Select language"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close"))
            .perform(click())
        waitForView(withContentDescription("Select country"), 3_000)
        onView(withContentDescription("Start a new game"))
            .check(matches(isDisplayed()))
    }

    /**
     * Test 3: Full flow when backend is available. Fill name, Start → Lobby → Start game → GamePlay.
     */
    @Test
    fun normalGame_fullFlow_toLobbyAndGamePlay() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Start a new game"))
            .perform(click())

        waitForView(withContentDescription("Select country"), 10_000)

        onView(withContentDescription("Player name"))
            .perform(typeText("EspressoHost"), closeSoftKeyboard())

        onView(withContentDescription("Start a new game"))
            .perform(click())

        waitForView(withContentDescription("Start game"), 20_000)

        onView(withContentDescription("Start game"))
            .perform(click())

        waitForAnyOf(
            listOf(
                withContentDescription("Next question"),
                withContentDescription("End game"),
                withContentDescription("First answer option"),
                withText("Next question"),
                withText("End game")
            ),
            25_000
        )
    }

    /**
     * Test 4: Full game cycle – answer 10 questions then end game and assert results screen.
     * Requires backend and WebSocket.
     */
    @Test
    fun normalGame_fullFlow_answer10Questions_toResults() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Start a new game"))
            .perform(click())
        waitForView(withContentDescription("Select country"), 10_000)

        onView(withContentDescription("Player name"))
            .perform(typeText("EspressoHost"), closeSoftKeyboard())
        onView(withContentDescription("Start a new game"))
            .perform(click())

        waitForView(withContentDescription("Start game"), 20_000)
        onView(withContentDescription("Start game"))
            .perform(click())

        // Wait until we're on game play (first question or next/end visible)
        waitForAnyOf(
            listOf(
                withContentDescription("First answer option"),
                withContentDescription("Next question"),
                withContentDescription("End game"),
                withText("Next question"),
                withText("End game")
            ),
            35_000
        )

        var questionIndex = 0
        while (questionIndex < 10) {
            // Wait for a question (option to tap) or End game on last question
            waitForAnyOf(
                listOf(
                    withContentDescription("First answer option"),
                    withContentDescription("End game"),
                    withText("End game")
                ),
                20_000
            )
            if (tryTap(withContentDescription("End game")) || tryTap(withText("End game")))
                break
            // Answer: tap first option
            onView(withContentDescription("First answer option")).perform(click())
            // Wait for "Next question" or "End game" after answer
            waitForAnyOf(
                listOf(
                    withContentDescription("Next question"),
                    withContentDescription("End game"),
                    withText("Next question"),
                    withText("End game")
                ),
                15_000
            )
            if (tryTap(withContentDescription("End game")) || tryTap(withText("End game")))
                break
            // Tap Next question (single instance at bottom of screen, visible after answering)
            val nextTapped = tryTap(withContentDescription("Next question")) || tryTap(withText("Next question"))
            if (!nextTapped) throw AssertionError("Next question button not found after answer")
            questionIndex++
        }

        // After loop we should be on results (or we tapped End game in the loop)
        waitForAnyOf(
            listOf(
                withContentDescription("Final results"),
                withText("Final results"),
                withContentDescription("Play another game"),
                withText("Play another game")
            ),
            20_000
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

    /** Returns true if the view was found and clicked. */
    private fun tryTap(matcher: org.hamcrest.Matcher<android.view.View>): Boolean {
        return try {
            onView(matcher).check(matches(isDisplayed()))
            onView(matcher).perform(click())
            true
        } catch (_: Exception) {
            false
        }
    }
}
