package pro.birdr;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyWebViewTopPadding();
    }

    private void applyWebViewTopPadding() {
        View content = findViewById(android.R.id.content);
        if (content == null) return;
        content.post(() -> {
            WebView wv = findViewById(R.id.webview);
//             if (wv != null) {
//                 int paddingPx = getResources().getDimensionPixelSize(R.dimen.webview_extra_top_padding);
//                 wv.setPadding(wv.getPaddingLeft(), paddingPx, wv.getPaddingRight(), wv.getPaddingBottom());
//             }
        });
    }
}
