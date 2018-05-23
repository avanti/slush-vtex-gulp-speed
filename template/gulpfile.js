'use strict'; /* jshint ignore:line */

var gulp = require('gulp')
  , xo = require('gulp-xo')
  , path = require('path')
  , fs = require('fs')
  , del = require('del')
  , pkg = JSON.parse(fs.readFileSync('package.json'))
  , version = parseInt(pkg.version)
  , secureUrl = pkg.secureUrl
  , store = pkg.store
  , acronym = pkg.acronym
  , env = pkg.environment
  , runSequence = require('run-sequence')
  , $ = require('gulp-load-plugins')() /* jshint ignore:line */

  /**
   * 3rd party vtex connect
   */
  , httpPlease = require('connect-http-please')
  , serveStatic = require('serve-static')
  , proxy = require('proxy-middleware')
  , url = require('url');


//                   __ _
//   ___ ___  _ __  / _(_) __ _
//  / __/ _ \| '_ \| |_| |/ _` |
// | (_| (_) | | | |  _| | (_| |
//  \___\___/|_| |_|_| |_|\__, |
//                        |___/

var accountName = store
  , environment = env
  , portalHost = accountName +'.'+ environment + '.com.br'
  , imgProxyOptions = url.parse('http://' + accountName + '.vteximg.com.br/arquivos')
  , portalProxyOptions = url.parse('http://' + portalHost + '/')
  , bannerFiles = '/**\n' +
                  ' * Avanti Comunicação <contato@penseavanti.com.br>\n' +
                  ' * '+ accountName + '\n' +
                  ' * @date <%= new Date() %>\n' +
                  ' */\n\n';

if (secureUrl) {
  imgProxyOptions = url.parse('https://' + accountName + '.vteximg.com.br/arquivos')
}

imgProxyOptions.route = '/arquivos';

if (secureUrl) {
  portalProxyOptions = url.parse('https://' + portalHost + '/')
}

portalProxyOptions.preserveHost = true;
portalProxyOptions.cookieRewrite = accountName +'.vtexlocal.com.br';

var rewriteLocation = function (location) {
  return location
    .replace('https:', 'http:')
    .replace(environment, 'vtexlocal');
};


//                                  _
//   ___ ___  _ __  _ __   ___  ___| |_
//  / __/ _ \| '_ \| '_ \ / _ \/ __| __|
// | (_| (_) | | | | | | |  __/ (__| |_
//  \___\___/|_| |_|_| |_|\___|\___|\__|

gulp.task('connect', function () {
  $.connect.server({
    host: '*',
    port: 80,
    middleware: function() {
      return [
        /**
         * disableCompression
         */
        function disableCompression (req, res, next) {
          req.headers['accept-encoding'] = 'identity';

          next();
        },

        function rewriteLocationHeader (req, res, next) {
          var writeHead = res.writeHead;

          res.writeHead = function (statusCode, headers) {
            if (headers && headers.location) {
              headers.location = rewriteLocation(headers.location)
            }

            res.writeHead = writeHead;

            return res.writeHead(statusCode, headers);
          };

          return next();
        },

        function replaceHost (req, res, next) {
          req.headers.host = portalHost

          next();
        },

        function replaceReferer (req, res, next) {
          req.headers.referer = portalHost;

          return next();
        },

        /**
         * replaceHtmlBody
         */
        function (req, res, next) {
          var ignoreReplace = [
            /\.js(\?.*)?$/,
            /\.css(\?.*)?$/,
            /\.svg(\?.*)?$/,
            /\.ico(\?.*)?$/,
            /\.woff(\?.*)?$/,
            /\.png(\?.*)?$/,
            /\.jpg(\?.*)?$/,
            /\.jpeg(\?.*)?$/,
            /\.gif(\?.*)?$/,
            /\.pdf(\?.*)?$/
          ];

          var ignore = ignoreReplace.some(function (ignore) {
            return ignore.test(req.url);
          });

          if (ignore) {
            next();
          }

          var data = '';
          var write = res.write;
          var end = res.end;
          var writeHead = res.writeHead;
          var proxiedStatusCode = null;
          var proxiedHeaders = null;

          res.writeHead = function (statusCode, headers) {
            proxiedStatusCode = statusCode;
            return proxiedHeaders = headers;
          };

          res.write = function (chunk) {
            return data += chunk;
          }

          res.end = function (chunk, encoding) {
            if (chunk) {
              data += chunk;
            }

            if (data) {
              data = data.replace(new RegExp(environment, 'g'), 'vtexlocal');
              data = data.replace(new RegExp('vteximg', 'g'), 'vtexlocal');

              if (secureUrl) {
                data = data.replace(new RegExp('https:\/\/' + accountName, 'g'), 'http://' + accountName);
              }
            }

            res.write = write;
            res.end = end;
            res.writeHead = writeHead;

            if (proxiedStatusCode && proxiedHeaders) {
              proxiedHeaders['content-length'] = Buffer.byteLength(data);

              if (secureUrl) {
                delete proxiedHeaders['content-security-policy'];
              }

              res.writeHead(proxiedStatusCode, proxiedHeaders);
            }

            return res.end(data, encoding);
          }

          next();
        },

        /**
         * httpPlease
         */
        httpPlease({
          host: portalHost
        }),

        /**
         * serveStatic
         */
        serveStatic('build/'),

        /**
         * Proxy
         */
        proxy(imgProxyOptions),
        proxy(portalProxyOptions),

        function (err, req, res, next) {
          console.log(err);
        }
      ]
    },
    livereload: true
  });

  var openOptions = {
    uri: 'http://'+ store +'.vtexlocal.com.br/',
    app: 'google chrome'
  };

  return gulp.src('./')
    .pipe($.open(openOptions));
});


//       _
//   ___| | ___  __ _ _ __
//  / __| |/ _ \/ _` | '_ \
// | (__| |  __/ (_| | | | |
//  \___|_|\___|\__,_|_| |_|

gulp.task('clean', function () {
  return del(['build/', 'deploy/']);
});


//    _                                _       _
//   (_) __ ___   ____ _ ___  ___ _ __(_)_ __ | |_
//   | |/ _` \ \ / / _` / __|/ __| '__| | '_ \| __|
//   | | (_| |\ V / (_| \__ \ (__| |  | | |_) | |_
//  _/ |\__,_| \_/ \__,_|___/\___|_|  |_| .__/ \__|
// |__/                                 |_|

gulp.task('js', ['js:main', 'js:legacy']);

gulp.task('js:main', function () {
  var devices = ['web', 'mob'];

  devices.map(function (device) {
    for (var i = 0; i <= version; i++) {
      /**
       * TODO:
       * Há um erro em [device] ao incrementar a versão no package.json
       */
      var vendor = JSON.parse(fs.readFileSync('vendor.json'))
        , files = vendor.versions[i][device]
        , mainFiles = [
            'assets/js/components/_'+ i +'-'+ acronym +'-'+ device +'*.js'
          , 'assets/js/controllers/_'+ i +'-'+ acronym +'-'+ device +'*.js'
        ];

      if (!files) {
        files = [];
      }

      Array.prototype.push.apply(files, mainFiles);

      gulp.src(files)
        .pipe($.sourcemaps.init())
        .pipe(
          $.babel().on('error', function (error) {
            console.log(error);
            this.emit('end');
          })
        )
        .pipe(xo())
        .pipe(xo.format())
        .pipe(xo.failAfterError())
        .pipe($.concat(i +'-'+ acronym +'-'+ device +'-application.js'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('build/arquivos/'))
        .pipe($.connect.reload());
    }
  });

  return;
});

gulp.task('js:legacy', function () {
  return gulp.src(['assets/js/*.js'])
    .pipe(gulp.dest('build/arquivos/'))
    .pipe($.connect.reload());
});


//    _                                _       _                 _            _
//   (_) __ ___   ____ _ ___  ___ _ __(_)_ __ | |_            __| | ___ _ __ | | ___  _   _
//   | |/ _` \ \ / / _` / __|/ __| '__| | '_ \| __|  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
//   | | (_| |\ V / (_| \__ \ (__| |  | | |_) | |_  |_____| | (_| |  __/ |_) | | (_) | |_| |
//  _/ |\__,_| \_/ \__,_|___/\___|_|  |_| .__/ \__|          \__,_|\___| .__/|_|\___/ \__, |
// |__/                                 |_|                            |_|            |___/

gulp.task('js:deploy', function () {
  return gulp.src('build/arquivos/*.js')
    .pipe($.stripComments())
    .pipe($.uglify())
    .pipe(
      $.babel().on('error', function (error) {
        console.log(error);
        this.emit('end');
      })
    )
    .pipe($.header(bannerFiles))
    .pipe(gulp.dest('deploy/js/'));
});


//      _         _
//  ___| |_ _   _| | ___  ___
// / __| __| | | | |/ _ \/ __|
// \__ \ |_| |_| | |  __/\__ \
// |___/\__|\__, |_|\___||___/
//          |___/

gulp.task('sass', function () {
  return gulp.src('assets/css/**/*.scss')
    .pipe($.compass({
      css: __dirname +'/build/arquivos/',
      sass: __dirname +'/assets/css/',
      image: __dirname +'/assets/img/',
      generated_images_path: __dirname +'/build/arquivos/',
      relative_assets: true,
      sourcemap: true
    }))
    .on('error', function (error) {
      console.log(error);
      this.emit('end');
    })
    .pipe(gulp.dest('build/arquivos/'))
    .pipe($.connect.reload());
});

gulp.task('css', function () {
  return gulp.src('assets/css/*.css')
    .pipe(gulp.dest('build/arquivos/'))
    .pipe($.connect.reload());
});


//      _         _                         _            _
//  ___| |_ _   _| | ___  ___            __| | ___ _ __ | | ___  _   _
// / __| __| | | | |/ _ \/ __|  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
// \__ \ |_| |_| | |  __/\__ \ |_____| | (_| |  __/ |_) | | (_) | |_| |
// |___/\__|\__, |_|\___||___/          \__,_|\___| .__/|_|\___/ \__, |
//          |___/                                 |_|            |___/

gulp.task('sass:deploy', function () {
  return gulp.src('build/arquivos/*.css')
    .pipe($.cssmin())
    .on('error', function (error) {
      console.log(error);
      this.emit('end');
    })
    .pipe($.header(bannerFiles))
    .pipe(gulp.dest('deploy/css/'));
});


//  _
// (_)_ __ ___   __ _
// | | '_ ` _ \ / _` |
// | | | | | | | (_| |
// |_|_| |_| |_|\__, |
//              |___/

gulp.task('img', function () {
  return gulp.src('assets/img/*.{jpg,png,gif}')
    .pipe(gulp.dest('build/arquivos/'))
    .pipe($.connect.reload());
});


//  _                               _            _
// (_)_ __ ___   __ _            __| | ___ _ __ | | ___  _   _
// | | '_ ` _ \ / _` |  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
// | | | | | | | (_| | |_____| | (_| |  __/ |_) | | (_) | |_| |
// |_|_| |_| |_|\__, |          \__,_|\___| .__/|_|\___/ \__, |
//              |___/                     |_|            |___/

gulp.task('img:deploy', function () {
  return gulp.src('build/arquivos/*.{png,jpg,gif}')
    // .pipe($.imageOptimization({
    //   optimizationLevel: 7,
    //   progressive: true,
    //   interlaced: true
    // }))
    .pipe(gulp.dest('deploy/img/'));
});


//                _       _
// __      ____ _| |_ ___| |__
// \ \ /\ / / _` | __/ __| '_ \
//  \ V  V / (_| | || (__| | | |
//   \_/\_/ \__,_|\__\___|_| |_|

gulp.task('watch', function () {
  gulp.watch(['assets/css/*.css'], ['css']);
  gulp.watch(['assets/css/**/*.scss', 'assets/img/sprite/*.png'], ['sass']);
  gulp.watch(['assets/js/**/*.js', 'vendor.json'], ['js']);
  gulp.watch(['assets/img/*.{jpg,png,gif}'], ['img']);
});


//  _           _ _     _
// | |__  _   _(_) | __| |
// | '_ \| | | | | |/ _` |
// | |_) | |_| | | | (_| |
// |_.__/ \__,_|_|_|\__,_|

gulp.task('build', ['js', 'sass', 'css', 'img']);


//      _            _
//   __| | ___ _ __ | | ___  _   _
//  / _` |/ _ \ '_ \| |/ _ \| | | |
// | (_| |  __/ |_) | | (_) | |_| |
//  \__,_|\___| .__/|_|\___/ \__, |
//            |_|            |___/

gulp.task('deploy', function (cb) {
  return runSequence('clean', 'build', ['js:deploy', 'sass:deploy', 'img:deploy'], cb);
});


//      _       __             _ _
//   __| | ___ / _| __ _ _   _| | |_
//  / _` |/ _ \ |_ / _` | | | | | __|
// | (_| |  __/  _| (_| | |_| | | |_
//  \__,_|\___|_|  \__,_|\__,_|_|\__|

gulp.task('default', function (cb) {
  return runSequence('clean', ['connect', 'build', 'watch'], cb);
});
