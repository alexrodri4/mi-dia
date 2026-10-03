package com.alexrodri.midia;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class MiDiaWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, MiDiaWidget.class));
        if (ids != null && ids.length > 0) render(c, m, ids);
    }

    static PendingIntent open(Context c, String what, int req) {
        Intent i = new Intent(c, MainActivity.class);
        i.putExtra("open", what);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void render(Context c, AppWidgetManager m, int[] ids) {
        String title = "Mi Día", next = "", list = "Abre la app para cargar tus tareas", spent = "";
        try {
            JSONObject o = new JSONObject(c.getSharedPreferences("midia", Context.MODE_PRIVATE).getString("widget", "{}"));
            if (o.has("pend")) {
                int p = o.optInt("pend");
                title = p == 0 ? "Todo al día ✨" : p + (p == 1 ? " tarea pendiente" : " tareas pendientes");
                JSONArray l = o.optJSONArray("lines");
                StringBuilder sb = new StringBuilder();
                if (l != null) for (int k = 0; k < l.length(); k++) { if (k > 0) sb.append('\n'); sb.append(l.getString(k)); }
                list = sb.length() > 0 ? sb.toString() : "No tienes nada pendiente. ¡Disfruta!";
                String n = o.optString("next", "");
                next = n.isEmpty() ? "" : "📅 " + n;
                String s = o.optString("spent", "");
                spent = s.isEmpty() ? "" : "Hoy " + s;
            }
        } catch (Exception ignored) {}
        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
            v.setTextViewText(R.id.w_title, title);
            v.setTextViewText(R.id.w_next, next);
            v.setTextViewText(R.id.w_list, list);
            v.setTextViewText(R.id.w_spent, spent);
            v.setOnClickPendingIntent(R.id.w_root, open(c, "tareas", 1));
            v.setOnClickPendingIntent(R.id.w_list, open(c, "tareas", 1));
            v.setOnClickPendingIntent(R.id.w_next, open(c, "calendario", 5));
            v.setOnClickPendingIntent(R.id.w_add, open(c, "add", 2));
            v.setOnClickPendingIntent(R.id.w_voice, open(c, "voice", 3));
            v.setOnClickPendingIntent(R.id.w_ai, open(c, "chat", 4));
            m.updateAppWidget(id, v);
        }
    }
}
