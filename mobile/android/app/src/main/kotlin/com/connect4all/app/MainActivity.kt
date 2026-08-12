package com.connect4all.app

import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "connect4all/signal"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            if (call.method == "read") {
                result.success(readSignal())
            } else {
                result.notImplemented()
            }
        }
    }

    private fun readSignal(): Map<String, Any?> {
        val tm = getSystemService(TELEPHONY_SERVICE) as TelephonyManager

        // getDataNetworkType() also requires READ_PHONE_STATE on API 29+ and
        // throws SecurityException without it — same story as signalStrength
        // below. The Dart side now requests the permission before ever
        // calling this, but this stays defensive rather than letting an
        // unexpected throw here fail the whole read (and silently record
        // every sample as "no signal") instead of just this one field.
        val networkType: String = try {
            networkTypeName(tm.dataNetworkType)
        } catch (e: SecurityException) {
            "none"
        }
        val operatorName: String? = try {
            tm.networkOperatorName
        } catch (e: SecurityException) {
            null
        }

        // SignalStrength.getCellSignalStrengths() requires API 30+; below that
        // we fall back to the legacy getLevel()-only accessor.
        val dbm: Int? = try {
            @Suppress("DEPRECATION")
            val strength: SignalStrength? = tm.signalStrength
            strength?.let {
                val cellStrengths = it.cellSignalStrengths
                if (cellStrengths.isNotEmpty()) cellStrengths[0].dbm else null
            }
        } catch (e: SecurityException) {
            null // READ_PHONE_STATE not granted
        }

        return mapOf(
            "dbm" to dbm,
            "networkType" to networkType,
            "operatorName" to operatorName
        )
    }

    private fun networkTypeName(type: Int): String = when (type) {
        TelephonyManager.NETWORK_TYPE_NR -> "5g"
        TelephonyManager.NETWORK_TYPE_LTE -> "4g"
        TelephonyManager.NETWORK_TYPE_HSPA,
        TelephonyManager.NETWORK_TYPE_HSPAP,
        TelephonyManager.NETWORK_TYPE_UMTS -> "3g"
        TelephonyManager.NETWORK_TYPE_EDGE,
        TelephonyManager.NETWORK_TYPE_GPRS -> "2g"
        else -> "none"
    }
}
