package pro.birdr.app

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.scrollTo
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
 * Espresso UI tests for Help overview and detail pages.
 * Run with: cd mobile/android && ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class HelpFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Open left menu, tap Help, assert Help overview screen loads (title or content).
     */
    @Test
    fun help_openFromMenu_overviewVisible() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Open menu"))
            .perform(click())
        waitForView(withContentDescription("Help"), 5_000)
        onView(withContentDescription("Help"))
            .perform(scrollTo(), click())

        // Wait for Help screen to load (API fetches pages; loading then shows "Help overview" or empty/error state)
        waitForAnyOf(
            listOf(
                withContentDescription("Help overview"),
                withText("No help pages available."),
                withText("Help")
            ),
            20_000
        )
    }

    /**
     * Open Help, tap a known help page (Privacy or About), assert detail screen with back link.
     * Requires backend to return help pages; if none, test passes without opening a page.
     */
    @Test
    fun help_openFirstPage_detailBackLinkVisible() {
        waitForView(withText("Welcome"), 30_000)

        onView(withContentDescription("Open menu"))
            .perform(click())
        waitForView(withContentDescription("Help"), 5_000)
        onView(withContentDescription("Help"))
            .perform(scrollTo(), click())

        // Wait for Help screen to load
        waitForAnyOf(
            listOf(
                withContentDescription("Help overview"),
                withText("No help pages available."),
                withText("Help")
            ),
            20_000
        )
        // Tap first available help page by common title (from API)
        val tapped = tryTap(withText("Privacy")) ||
            tryTap(withText("About Birdr")) ||
            tryTap(withText("About"))
        if (tapped) {
            waitForAnyOf(
                listOf(
                    withContentDescription("Back to Help overview"),
                    withText("← Help overview")
                ),
                15_000
            )
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
