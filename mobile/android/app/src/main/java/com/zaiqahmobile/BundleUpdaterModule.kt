package com.zaiqahmobile

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactApplication
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class BundleUpdaterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "BundleUpdater"
    }

    @ReactMethod
    fun downloadBundle(downloadUrl: String, promise: Promise) {
        thread {
            try {
                val url = URL(downloadUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.connect()

                if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                    promise.reject("DOWNLOAD_ERROR", "Server returned HTTP ${connection.responseCode}")
                    return@thread
                }

                val input = BufferedInputStream(connection.inputStream)
                val outputFile = File(reactApplicationContext.filesDir, "index.android.bundle")
                val output = FileOutputStream(outputFile)

                val data = ByteArray(4096)
                var count: Int
                while (input.read(data).also { count = it } != -1) {
                    output.write(data, 0, count)
                }

                output.flush()
                output.close()
                input.close()

                promise.resolve(outputFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("DOWNLOAD_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun clearUpdate(promise: Promise) {
        try {
            val outputFile = File(reactApplicationContext.filesDir, "index.android.bundle")
            if (outputFile.exists()) {
                val deleted = outputFile.delete()
                promise.resolve(deleted)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("CLEAR_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun reloadJS() {
        reactApplicationContext.currentActivity?.runOnUiThread {
            val app = reactApplicationContext.currentActivity?.application as? ReactApplication
            app?.reactHost?.reload("OTA Update Reload")
        }
    }
}
