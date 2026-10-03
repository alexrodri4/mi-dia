package com.alexrodri.midia;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Locale;

public class MainActivity extends Activity {
    static final String HOST = "midia.app";
    static final String BASE = "https://" + HOST + "/";
    static final int REQ_FILE = 11, REQ_MIC = 12, REQ_NOTIF = 13;

    WebView web;
    SharedPreferences prefs;
    Handler ui;
    ValueCallback<Uri[]> fileCb;
    Uri camUri;
    SpeechRecognizer sr;
    String srLang = "es-ES";
    boolean pageReady = false;
    String pendingOpen = null;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        ui = new Handler(Looper.getMainLooper());
        prefs = getSharedPreferences("midia", MODE_PRIVATE);
        Notifs.ensureChannels(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#08080B"));
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.addJavascriptInterface(new Bridge(), "MiDiaNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String p = u.getPath();
                if (p == null || p.equals("/") || p.isEmpty()) p = "/index.html";
                try {
                    InputStream in = getAssets().open(p.substring(1));
                    String mime = p.endsWith(".html") ? "text/html" : p.endsWith(".js") ? "application/javascript" : p.endsWith(".css") ? "text/css" : p.endsWith(".png") ? "image/png" : "application/octet-stream";
                    return new WebResourceResponse(mime, "utf-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", new java.util.HashMap<String, String>(), new java.io.ByteArrayInputStream(new byte[0]));
                }
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams fp) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                openChooser(fp);
                return true;
            }
        });
        handleIntent(getIntent());
        web.loadUrl(BASE + "index.html");
    }

    void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        handleIntent(i);
    }

    void handleIntent(Intent i) {
        if (i == null) return;
        String o = i.getStringExtra("open");
        if (o == null) return;
        i.removeExtra("open");
        if (pageReady) js("window.__mdOpen&&window.__mdOpen(" + JSONObject.quote(o) + ")");
        else pendingOpen = o;
    }

    void js(final String code) {
        ui.post(new Runnable() { public void run() { if (web != null) web.evaluateJavascript(code, null); } });
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__mdBack&&window.__mdBack())?'1':'0'", new ValueCallback<String>() { public void onReceiveValue(String v) {
            if (v == null || !v.contains("1")) moveTaskToBack(true);
        } });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pageReady) js("window.__mdSync&&window.__mdSync()");
    }

    @Override
    protected void onDestroy() {
        if (sr != null) { try { sr.destroy(); } catch (Exception ignored) {} sr = null; }
        super.onDestroy();
    }

    /* ---------------- selector de archivos (foto de ticket / importar) ---------------- */
    void openChooser(WebChromeClient.FileChooserParams fp) {
        String[] acc = fp != null ? fp.getAcceptTypes() : null;
        boolean image = false;
        if (acc != null) for (String a : acc) if (a != null && a.startsWith("image")) image = true;
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType(image ? "image/*" : "*/*");
        Intent chooser = Intent.createChooser(pick, image ? "Foto del ticket" : "Elige el archivo");
        camUri = null;
        if (image) {
            try {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Images.Media.DISPLAY_NAME, "ticket_" + System.currentTimeMillis() + ".jpg");
                cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                cv.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Mi Dia");
                camUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cam.putExtra(MediaStore.EXTRA_OUTPUT, camUri);
                cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
            } catch (Exception e) { camUri = null; }
        }
        try { startActivityForResult(chooser, REQ_FILE); }
        catch (ActivityNotFoundException e) { if (fileCb != null) fileCb.onReceiveValue(null); fileCb = null; }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (res == RESULT_OK) {
            if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) out = new Uri[]{data.getClipData().getItemAt(0).getUri()};
            else if (camUri != null) out = new Uri[]{camUri};
        }
        if (out == null || (camUri != null && out[0] != camUri)) {
            if (camUri != null) { try { getContentResolver().delete(camUri, null, null); } catch (Exception ignored) {} }
        }
        fileCb.onReceiveValue(out);
        fileCb = null;
        camUri = null;
    }

    /* ---------------- voz ---------------- */
    void voice(String ev, String t) {
        js("window.__mdVoice&&window.__mdVoice(" + JSONObject.quote(ev) + "," + JSONObject.quote(t == null ? "" : t) + ")");
    }

    void startListeningUi() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { voice("error", "audio"); return; }
        if (sr == null) {
            sr = SpeechRecognizer.createSpeechRecognizer(this);
            sr.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle p) { voice("start", ""); }
                public void onBeginningOfSpeech() {}
                public void onRmsChanged(float v) {}
                public void onBufferReceived(byte[] b) {}
                public void onEndOfSpeech() {}
                public void onError(int e) {
                    String c = e == SpeechRecognizer.ERROR_NO_MATCH ? "nomatch" : e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "timeout"
                            : e == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "perm" : (e == SpeechRecognizer.ERROR_NETWORK || e == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) ? "network"
                            : e == SpeechRecognizer.ERROR_CLIENT ? "client" : "audio";
                    if (e == SpeechRecognizer.ERROR_CLIENT) return; // ocurre al cancelar
                    voice("error", c);
                }
                public void onResults(Bundle r) {
                    ArrayList<String> l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    voice("final", l != null && !l.isEmpty() ? l.get(0) : "");
                }
                public void onPartialResults(Bundle r) {
                    ArrayList<String> l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (l != null && !l.isEmpty() && l.get(0).length() > 0) voice("partial", l.get(0));
                }
                public void onEvent(int t, Bundle p) {}
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, srLang);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
        i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L);
        try { sr.startListening(i); } catch (Exception e) { voice("error", "audio"); }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (req == REQ_MIC) { if (ok) startListeningUi(); else voice("error", "perm"); }
        if (req == REQ_NOTIF) js("window.__mdNotifPerm&&window.__mdNotifPerm(" + ok + ")");
    }

    /* ---------------- puente JS ---------------- */
    class Bridge {
        @JavascriptInterface public void ready() {
            pageReady = true;
            if (pendingOpen != null) { String o = pendingOpen; pendingOpen = null; js("window.__mdOpen&&window.__mdOpen(" + JSONObject.quote(o) + ")"); }
        }
        @JavascriptInterface public boolean hasApiKey() { return prefs.getString("apiKey", "").length() > 10; }
        @JavascriptInterface public String apiKeyHint() {
            String k = prefs.getString("apiKey", "");
            return k.length() > 14 ? k.substring(0, 7) + "…" + k.substring(k.length() - 4) : "";
        }
        @JavascriptInterface public void setApiKey(String k) { prefs.edit().putString("apiKey", k == null ? "" : k.trim()).apply(); }
        @JavascriptInterface public void clearApiKey() { prefs.edit().remove("apiKey").apply(); }
        @JavascriptInterface public void setBudget(double v) { prefs.edit().putFloat("budget", (float) v).apply(); }
        @JavascriptInterface public String usageJson() {
            try {
                String m = new java.text.SimpleDateFormat("yyyy-MM", Locale.US).format(new java.util.Date());
                JSONObject o = new JSONObject();
                boolean cur = m.equals(prefs.getString("uMonth", ""));
                o.put("month", m);
                o.put("calls", cur ? prefs.getInt("uCalls", 0) : 0);
                o.put("costUsd", cur ? prefs.getFloat("uCost", 0f) : 0f);
                o.put("budget", prefs.getFloat("budget", 5f));
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void ask(final int id, final String payload) {
            new Thread(new Runnable() { public void run() {
                int status = 0; String body = "{\"error\":{\"message\":\"Sin conexión\"}}";
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL("https://api.anthropic.com/v1/messages").openConnection();
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(180000);
                    c.setDoOutput(true);
                    c.setRequestProperty("content-type", "application/json");
                    c.setRequestProperty("x-api-key", prefs.getString("apiKey", ""));
                    c.setRequestProperty("anthropic-version", "2023-06-01");
                    try (OutputStream os = c.getOutputStream()) { os.write(payload.getBytes(StandardCharsets.UTF_8)); }
                    status = c.getResponseCode();
                    InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    body = in == null ? "{}" : readAll(in);
                    if (status == 200) track(body);
                } catch (Exception e) {
                    status = 0;
                } finally { if (c != null) c.disconnect(); }
                js("window.__mdAi&&window.__mdAi(" + id + "," + JSONObject.quote(body) + "," + status + ")");
            } }).start();
        }
        @JavascriptInterface public void startListening(String lang) {
            if (lang != null && lang.length() > 1) srLang = lang;
            ui.post(new Runnable() { public void run() { startListeningUi(); } });
        }
        @JavascriptInterface public void stopListening() { ui.post(new Runnable() { public void run() { if (sr != null) try { sr.stopListening(); } catch (Exception ignored) {} } }); }
        @JavascriptInterface public void cancelListening() { ui.post(new Runnable() { public void run() { if (sr != null) try { sr.cancel(); } catch (Exception ignored) {} } }); }
        @JavascriptInterface public String saveFile(String name, String data, String mime) {
            try {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime == null ? "application/json" : mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                ContentResolver cr = getContentResolver();
                Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (u == null) return "No se pudo crear el archivo";
                try (OutputStream os = cr.openOutputStream(u)) { os.write(data.getBytes(StandardCharsets.UTF_8)); }
                return "ok";
            } catch (Exception e) { return String.valueOf(e.getMessage()); }
        }
        @JavascriptInterface public void toast(final String t) { ui.post(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show(); } }); }
        @JavascriptInterface public boolean notificationsAllowed() { return Notifs.allowed(MainActivity.this); }
        @JavascriptInterface public void requestNotifPermission() {
            ui.post(new Runnable() { public void run() {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                        && shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) | !prefs.getBoolean("askedNotif", false)) {
                    prefs.edit().putBoolean("askedNotif", true).apply();
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                } else if (!Notifs.allowed(MainActivity.this)) {
                    Intent i = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    i.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
                    try { startActivity(i); } catch (Exception ignored) {}
                } else js("window.__mdNotifPerm&&window.__mdNotifPerm(true)");
            } });
        }
        @JavascriptInterface public void testNotification() {
            Notifs.show(MainActivity.this, 999, "🔔 Mi Día", "Así te llegarán los avisos", "tareas");
        }
        @JavascriptInterface public void scheduleAlarms(String json) {
            prefs.edit().putString("alarms", json).apply();
            Notifs.scheduleAll(MainActivity.this, json);
        }
        @JavascriptInterface public void syncWidget(String json) {
            prefs.edit().putString("widget", json).apply();
            MiDiaWidget.updateAll(MainActivity.this);
        }
        @JavascriptInterface public void setBars(final String hex, final boolean light) {
            ui.post(new Runnable() { public void run() {
                try {
                    Window w = getWindow();
                    int c = Color.parseColor(hex);
                    w.setStatusBarColor(c);
                    w.setNavigationBarColor(c);
                    web.setBackgroundColor(c);
                    int f = w.getDecorView().getSystemUiVisibility();
                    if (light) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    else f &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                    w.getDecorView().setSystemUiVisibility(f);
                } catch (Exception ignored) {}
            } });
        }
        @JavascriptInterface public void openUrl(final String u) { ui.post(new Runnable() { public void run() { openExternal(Uri.parse(u)); } }); }
    }

    static String readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        in.close();
        return bo.toString("UTF-8");
    }

    void track(String body) {
        try {
            JSONObject j = new JSONObject(body);
            JSONObject u = j.optJSONObject("usage");
            if (u == null) return;
            String model = j.optString("model", "");
            double pin = 2, pout = 10;
            if (model.contains("haiku")) { pin = 1; pout = 5; }
            else if (model.contains("opus")) { pin = 4; pout = 20; }
            double in = u.optDouble("input_tokens", 0) + u.optDouble("cache_creation_input_tokens", 0) * 1.25 + u.optDouble("cache_read_input_tokens", 0) * 0.1;
            double cost = in * pin / 1e6 + u.optDouble("output_tokens", 0) * pout / 1e6;
            String m = new java.text.SimpleDateFormat("yyyy-MM", Locale.US).format(Calendar.getInstance().getTime());
            SharedPreferences.Editor e = prefs.edit();
            if (!m.equals(prefs.getString("uMonth", ""))) { e.putString("uMonth", m).putInt("uCalls", 0).putFloat("uCost", 0f); e.apply(); }
            prefs.edit().putInt("uCalls", prefs.getInt("uCalls", 0) + 1).putFloat("uCost", (float) (prefs.getFloat("uCost", 0f) + cost)).apply();
        } catch (Exception ignored) {}
    }
}
