package pro.birdr.app

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.PerformException
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.util.HumanReadables
import androidx.test.espresso.util.TreeIterables
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.CoreMatchers.anyOf
import org.hamcrest.Matcher
import org.hamcrest.StringDescription
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeoutException

/**
 * Minimal CI smoke test: debug APK must embed JS (no Metro) and reach the home screen.
 * Run: cd mobile/android && CI=true ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class HomeSmokeTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun homeScreenLoads() {
        val home = anyOf(
            withText("Welcome"),
            withText("Welkom"),
            withContentDescription("Start a new game"),
            withContentDescription("Start een nieuw spel"),
        )
        waitForView(home, 60_000)
        onView(home).check(matches(isDisplayed()))
    }

    private fun waitForView(matcher: Matcher<View>, timeoutMs: Long) {
        onView(isRoot()).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isRoot()

            override fun getDescription(): String {
                val desc = StringDescription()
                matcher.describeTo(desc)
                return "wait for $desc (timeout ${timeoutMs}ms)"
            }

            override fun perform(uiController: UiController, view: View) {
                uiController.loopMainThreadUntilIdle()
                val start = System.currentTimeMillis()
                do {
                    for (child in TreeIterables.breadthFirstViewTraversal(view)) {
                        if (matcher.matches(child)) {
                            return
                        }
                    }
                    uiController.loopMainThreadForAtLeast(250)
                } while (System.currentTimeMillis() - start < timeoutMs)

                throw PerformException.Builder()
                    .withActionDescription(description)
                    .withViewDescription(HumanReadables.describe(view))
                    .withCause(
                        TimeoutException(
                            "Home UI not found. Local debug builds need Metro, or run with CI=true to embed JS."
                        )
                    )
                    .build()
            }
        })
    }
}
