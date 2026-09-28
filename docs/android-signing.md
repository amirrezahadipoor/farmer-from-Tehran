# امضای نسخه‌ی release برای اندروید (اختیاری)

ورک‌فلو `.github/workflows/apk.yml` به‌صورتِ پیش‌فرض **`assembleDebug`** می‌سازد: خروجی
یک APKِ قابلِ نصب روی هر دستگاه است (با کلیدِ اشکال‌زدایی) و برای تست و ارسال به
دوستان کافی است. اگر بخواهی APK را در Google Play منتشر کنی، باید با کلیدِ خودت
امضا شود. این سند همان کار را توضیح می‌دهد و **هیچ‌چیزِ آن برای بیلدِ debug لازم نیست**:
تا وقتی secretها ست نشوند، ورک‌فلو بدونِ تغییر به مسیرِ debug برمی‌گردد.

## ۱. ساختِ keystore (یک‌بار، روی کامپیوترِ خودت)

```bash
keytool -genkeypair -v -keystore farm.keystore -alias farm \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=amirrezahadipoor, O=Golden Valley Farm, C=IR"
```

- `farm.keystore` و رمزهایش را **هیچ‌وقت در مخزن نگذار** (در `.gitignore` هم هست).
- اگر این کلید را گم کنی، دیگر نمی‌توانی همان بسته را در Play به‌روزرسانی کنی؛
  پس یک پشتیبانِ امن (مثلاً مدیریت‌رمز) از آن بگیر.

## ۲. گذاشتنِ کلید در secrets مخزن

GitHub به Settings به Secrets and variables به Actions:

| Secret | مقدار |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | خروجیِ `base64 -w0 farm.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | رمزِ خودِ keystore |
| `ANDROID_KEY_ALIAS` | `farm` |
| `ANDROID_KEY_PASSWORD` | رمزِ کلید (اگر با رمزِ keystore یکی است، همان) |

## ۳. افزودنِ مرحله‌ی امضا به ورک‌فلو

بعد از `npx cap sync android` و قبل از `assembleRelease`، کلید را جا بگذار:

```yaml
      - name: آماده‌سازیِ کلیدِ امضا
        if: ${{ env.ANDROID_KEYSTORE_BASE64 != '' }}
        run: |
          echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/farm.keystore
          cat >> android/gradle.properties <<'EOF'
          FARM_STORE_FILE=farm.keystore
          FARM_STORE_PASSWORD=$ANDROID_KEYSTORE_PASSWORD
          FARM_KEY_ALIAS=$ANDROID_KEY_ALIAS
          FARM_KEY_PASSWORD=$ANDROID_KEY_PASSWORD
          EOF
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: ساختِ APKِ امضاشده
        if: ${{ env.ANDROID_KEYSTORE_BASE64 != '' }}
        working-directory: android
        run: ./gradlew assembleRelease --no-daemon
```

و در `android/app/build.gradle` بلوکِ `signingConfigs` و `buildTypes.release` را به این
ویژگی‌ها وصل کن (`storeFile file(FARM_STORE_FILE)` و …).

## ۴. خروجی و انتشار

- خروجیِ امضاشده: `android/app/build/outputs/apk/release/app-release.apk`
- برای Play باید `bundleRelease` بزنی تا `.aab` ساخته شود؛ APK همان خروجیِ قابلِ
  نصبِ کنارِ Play است.
- هر دو حالت (debug و release) را می‌توانی در یک ورک‌فلو کنار هم آپلود کنی؛ نامِ
  artifactها را متفاوت بگذار (`apk-debug` و `apk-release`).

## ۵. چرا این کار در این پروژه «اختیاری» ثبت شده

بازی آفلاین‌فِرست است، بدونِ سرور و بدونِ خریدِ درون‌برنامه‌ای؛ امروز هدف، دادنِ یک
APKِ قابلِ نصب به بازیکن است. امضای Play فقط وقتی لازم می‌شود که بخواهی روی Google
Play منتشر کنی — و همان موقع، همین سند به‌عنوانِ چک‌لیست کافی است.
