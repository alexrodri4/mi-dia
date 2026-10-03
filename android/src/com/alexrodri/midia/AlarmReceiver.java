package com.alexrodri.midia;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        int id = i.getIntExtra("id", (int) (System.currentTimeMillis() % 100000));
        Notifs.show(c, id, i.getStringExtra("t"), i.getStringExtra("b"), i.getStringExtra("tab"));
    }
}
