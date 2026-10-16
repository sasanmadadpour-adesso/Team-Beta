package com.adesso.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

public class MainActivity extends Activity {
    private WebView web;
    private static final String CHAT_CHANNEL = "community_messages";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "selim.cloud".equals(uri.getHost()) && uri.getPath().startsWith("/adesso")) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });
        web.addJavascriptInterface(new NotificationBridge(), "AndroidNotifications");

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.loadUrl("https://selim.cloud/adesso/?app=1");
        setContentView(web);
        createNotificationChannel();
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1001);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHAT_CHANNEL, "Community-Nachrichten", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Neue Stromanfragen und Nachrichten aus Ihrer Community");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private class NotificationBridge {
        @JavascriptInterface
        public void notify(String title, String body) {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(MainActivity.this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return;
                NotificationCompat.Builder notification = new NotificationCompat.Builder(MainActivity.this, CHAT_CHANNEL)
                        .setSmallIcon(android.R.drawable.ic_dialog_email)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setAutoCancel(true)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                manager.notify((int) (System.currentTimeMillis() & 0xfffffff), notification.build());
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
