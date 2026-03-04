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
 *
 * Tests 1–2 only need the app (no backend). Test 3 requires backend and WebSocket to reach Lobby and GamePlay.
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

        waitForView(withContentDescription("Select country"), 5_000)

        onView(withContentDescription("Select country"))
            .perform(click())
        onView(withText("Select country"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close"))
            .perform(click())

        onView(withContentDescription("Select language"))
            .perform(click())
        onView(withText("Select language"))
            .check(matches(isDisplayed()))
        onView(withContentDescription("Close"))
            .perform(click())

        onView(withContentDescription("Start a new game"))
            .check(matches(isDisplayed()))
    }

    /**
     * Test 3: Full flow when backend is available. Fill name, Start → Lobby → Start game → GamePlay (or loading).
     * Requires backend and WebSocket. If backend is down, this test will fail at waiting for "Game Lobby".
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

        waitForView(withText("Game Lobby"), 20_000)

        onView(withContentDescription("Start game"))
            .perform(click())

        waitForAnyOf(
            listOf(
                withContentDescription("Next question"),
                withContentDescription("End game"),
                withText("Next question"),
                withText("End game")
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
}
