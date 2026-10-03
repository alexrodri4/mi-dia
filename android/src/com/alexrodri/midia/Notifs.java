package com.alexrodri.midia;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public class Notifs {
    static final String CH = "recordatorios";

    static void ensureChannels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Recordatorios", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Tareas que vencen, recordatorios del calendario y resumen diario");
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
        }
    }

    static boolean allowed(Context c) {
        return c.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    static void show(Context c, int id, String title, String body, String tab) {
        ensureChannels(c);
        Intent open = new Intent(c, MainActivity.class);
        open.putExtra("open", tab == null ? "tareas" : tab);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CH)
                .setSmallIcon(R.drawable.ic_notif)
                .setColor(0xFF3B9EFF)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        try { c.getSystemService(NotificationManager.class).notify(id, n); } catch (SecurityException ignored) {}
    }

    static PendingIntent alarmPi(Context c, int req, String title, String body, String tab, boolean create) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.putExtra("t", title); i.putExtra("b", body); i.putExtra("tab", tab); i.putExtra("id", req);
        int f = PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(c, req, i, f);
    }

    /** Programa todos los avisos. Cancela los que ya no están. */
    static void scheduleAll(Context c, String json) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        SharedPreferences p = c.getSharedPreferences("midia", Context.MODE_PRIVATE);
        int prevCount = p.getInt("alarmCount", 0);
        int n = 0;
        long now = System.currentTimeMillis();
        try {
            JSONArray a = new JSONArray(json == null ? "[]" : json);
            for (int k = 0; k < a.length() && n < 150; k++) {
                JSONObject o = a.getJSONObject(k);
                long at = o.optLong("at", 0);
                if (at <= now) continue;
                int req = 1000 + n;
                PendingIntent pi = alarmPi(c, req, o.optString("title"), o.optString("body"), o.optString("tab", "tareas"), true);
                boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
                try {
                    if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                    else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                }
                n++;
            }
        } catch (Exception ignored) {}
        for (int k = n; k < prevCount; k++) {
            PendingIntent old = alarmPi(c, 1000 + k, "", "", "", false);
            if (old != null) { am.cancel(old); old.cancel(); }
        }
        p.edit().putInt("alarmCount", n).apply();
    }
}
