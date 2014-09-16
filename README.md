## Airspace Desktop

### Prerequisite

- [Node.js v0.10.x](http://nodejs.org/download/)
- [node-webkit](https://github.com/rogerwang/node-webkit#downloads)
- [chromedriver](https://github.com/rogerwang/node-webkit/wiki/chromedriver) for running tests

### Copy node-webkit to your /opt/local or C:\Libraries-x86, depending on your OS (i.e.):

    sudo cp -r ~/Downloads/node-webkit-v*.*.*-osx-ia32/node-webkit.app /opt/local/Libraries/node-webkit-v*.*.*-osx-ia32/

### If you want to run tests, copy chromedriver to the same directory as the node-webkit binary

    sudo cp -r ~/Downloads/chromedriver2_server /opt/local/Libraries/node-webkit-v*.*.*-osx-ia32/

### Running (dev mode)

Copy over oauth2 access token from production central:

```ruby
ActiveRecord::Base.connection.execute('select * from oauth2_clients limit 1').to_a
```

In to your local database:

```ruby
Devise::Oauth2Providable::Client.create!(name: 'launcher', redirect_uri: 'http://local.leapmotion:3010/', website: 'http://local.leapmotion.com:3010/', identifier: '73fde9aa45ef818ecb137aeacd886253', secret: '8daf22818f30f4a9f86201d1b276b39c')
```

Or staging:

```ruby
Devise::Oauth2Providable::Client.create!(name: 'launcher', redirect_uri: 'https://lm-s-warehouse-amnesia.leapmotion.com/', website: 'https://lm-s-warehouse-amnesia.leapmotion.com/', identifier: '73fde9aa45ef818ecb137aeacd886253', secret: '8daf22818f30f4a9f86201d1b276b39c')
```


```
    # add these in .bashrc

    # localhost
    alias airspace='cd $HOME/homebase; CENTRAL_URL=http://local.leapmotion:3010/ WAREHOUSE_URL=http://local.leapmotion:5001/  AIRSPACE_URL=http://local.leapmotion:5002/ LEAPHOME_ENV=development bin/airspace'
    alias oobe='cd $HOME/homebase;rm -rf $HOME/Library/Application\ Support/Leap\ Motion/ $HOME/Library/Application\ Support/Airspace ; rm -rf $HOME/Applications/AirspaceApps/;  airspace'

    # staging (disabled HTTP Basic Auth)
    alias stairspace='cd $HOME/homebase; CENTRAL_URL=https://lm-s-central-amnesia.leapmotion.com/ WAREHOUSE_URL=https://lm-s-warehouse-amnesia.leapmotion.com/ AIRSPACE_URL=https://lm-s-airspace-amnesia.leapmotion.com/ LEAPHOME_ENV=staging bin/airspace'
    alias stoobe='cd $HOME/homebase;rm -rf $HOME/Library/Application\ Support/Leap\ Motion/ $HOME/Library/Application\ Support/Airspace ; rm -rf $HOME/Applications/AirspaceApps/; stairspace'

    # production
    alias prairspace='cd $HOME/homebase;bin/airspace'
    alias proobe='cd $HOME/homebase;rm -rf $HOME/Library/Application\ Support/Leap\ Motion/ $HOME/Library/Application\ Support/Airspace ; rm -rf $HOME/Applications/AirspaceApps/; prairspace'

    # use the airspace alias for localhost (have central and warehouse running)
    airspace
```

All staging and dev machines seem to be using sandbox 1 for pubnub.

### Testing

    node bin/test [test_file1 [test_file2] ...]

Running without specifying test file(s) will run the entire set of test suites.

### Building

If this is your first install OR the package.json file has changed which modules are included (or their version number), run

    npm install

If it's a release build, first run:

    node bin/release [version]

To build, run:

    node bin/build

Outputs to: <code>build/</code>

Building for Windows requires building on Windows, unfortunately.

### Troubleshooting

Use the [Konami code](http://en.wikipedia.org/wiki/Konami_Code) to open the debugger in production.

### App Manifest

See <code>config/non-store-app-manifest.json</code>.

Get [s3cmd](http://s3tools.org/), and configure it with the correct credentials for
the <code>lm-assets</code> S3 bucket (ask Josh Hull if you don't have them).

Upload with:

    s3cmd put -P config/non-store-app-manifest.json s3://lm-assets/airspace-desktop/non-store-app-manifest-v2.json

Builtin tiles can be uploaded with:

    s3cmd put -P static/images/icons/community-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/icons/store-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/community-tile.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/store-tile.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/gesture-tile.png s3://lm-assets/airspace-desktop/documentation-tile.png
    s3cmd put -P static/images/tiles/magic-tile.png s3://lm-assets/airspace-desktop/orientation-tile.png

### Notes

* 64-bit Ubuntu requires 32-bit GTK libs: <code>sudo apt-get install ia32-libs-gtk</code>. On newer versions,
  you'll need to run <code>sudo ln -sf /lib/i386-linux-gnu/libudev.so.1 /lib/i386-linux-gnu/libudev.so.0</code>
  after installation.
* If RCEDIT.exe fails, make sure your virus scanner has the build folder listed as an exception-
  they scan files as they're created, and this causes access violations when RCEDIT goes to change the icon.
* You may want to set <code>ulimit -n 1200</code> on OS X to get around the low default max number of open files.
  (In release builds, this gets done automatically.)

### Get ahXXXX version
```
 git log --reverse --oneline | cat -n
```
