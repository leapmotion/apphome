## Airspace Desktop

### Prerequisite

[Node.js v0.10.x](http://nodejs.org/download/)

### Running (dev mode)

    node bin/airspace

### Testing

    npm test

### Building

    node bin/build [version]

Outputs to: <code>build/</code>

### App Manifest

See <code>config/non-store-app-manifest.json</code>.

Get [s3cmd](http://s3tools.org/), and configure it with the correct credentials for
the <code>lm-assets</code> S3 bucket (ask Josh Hull if you don't have them).

Upload with:

    s3cmd put -P config/non-store-app-manifest.json s3://lm-assets/airspace-desktop/

App Store and Leap Community tiles can be uploaded with:

    s3cmd put -P static/images/icons/community-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/icons/store-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/community-tile.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/store-tile.png s3://lm-assets/airspace-desktop/

### Notes

* 64-bit Ubuntu requires 32-bit GTK libs: <code>sudo apt-get install ia32-libs-gtk</code>
* If RCEDIT.exe fails, make sure your virus scanner has the build folder listed as an exception-
  they scan files as they're created, and this causes access violations when RCEDIT goes to change the icon.
