set -e
PW="${MIDIA_KS_PASS:?Define MIDIA_KS_PASS con la contraseña de la keystore (está en mi-dia-apk-keystore/midia-firma.txt, fuera del repo)}"
T=$(cd tools; pwd); A=$(cd apk; pwd); B=$A/build
rm -rf $B; mkdir -p $B/res $B/gen $B/classes $B/dex
mkdir -p $A/assets && cp ${INDEX:-../index-apk.html} $A/assets/index.html
$T/aapt2 compile --dir $A/res -o $B/res.zip
$T/aapt2 link -o $B/base.apk -I $T/android.jar --manifest $A/AndroidManifest.xml -A $A/assets --java $B/gen --min-sdk-version 29 --target-sdk-version 34 --version-code ${VC:-1} --version-name ${VN:-1.0} $B/res.zip -0 html
java -jar $T/ecj.jar -source 8 -target 8 -encoding UTF-8 -nowarn -bootclasspath $T/android.jar -classpath $T/android.jar -d $B/classes $(find $A/src $B/gen -name '*.java') 2>&1 | grep -v JAVA_TOOL | grep -i -B2 -A3 error || true
ls $B/classes/com/alexrodri/midia/MainActivity.class >/dev/null
java -cp $T/d8.jar com.android.tools.r8.D8 --release --min-api 29 --lib $T/android.jar --output $B/dex $(find $B/classes -name '*.class') 2>&1 | grep -v JAVA_TOOL || true
cp $B/base.apk $B/unsigned.apk; (cd $B/dex && zip -q -j ../unsigned.apk classes.dex)
python3 $T/zipalign.py $B/unsigned.apk $B/aligned.apk
[ -f $A/../midia-release.keystore ] || keytool -genkeypair -keystore $A/../midia-release.keystore -alias midia -keyalg RSA -keysize 2048 -validity 10000 -storepass $PW -keypass $PW -dname "CN=Alex, O=Mi Dia, C=ES" 2>&1 | grep -v JAVA_TOOL
java -jar $T/apksigner.jar sign --ks $A/../midia-release.keystore --ks-pass pass:$PW --key-pass pass:$PW --ks-key-alias midia --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out $B/MiDia.apk $B/aligned.apk 2>&1 | grep -v JAVA_TOOL || true
java -jar $T/apksigner.jar verify --verbose $B/MiDia.apk 2>&1 | grep -v JAVA_TOOL | head -8
ls -la $B/MiDia.apk
