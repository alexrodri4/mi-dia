package com.alexrodri.midia;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String j = c.getSharedPreferences("midia", Context.MODE_PRIVATE).getString("alarms", "[]");
        Notifs.scheduleAll(c, j);
        MiDiaWidget.updateAll(c);
    }
}
