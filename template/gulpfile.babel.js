import fs from 'fs'
import url from 'url'
import gulp from 'gulp'
import del from 'del'
import runSequence from 'run-sequence'
import gulpLoad from 'gulp-load-plugins'

import httpPlease from 'connect-http-please'
import serveStatic from 'serve-static'
import proxy from 'proxy-middleware'

import vendor from './vendor'
import middlewares from './middlewares'


//                   __ _
//   ___ ___  _ __  / _(_) __ _
//  / __/ _ \| '_ \| |_| |/ _` |
// | (_| (_) | | | |  _| | (_| |
//  \___\___/|_| |_|_| |_|\__, |
//                        |___/

/**
 * General
 */
const $ = gulpLoad()
const {
  vtex,
  version
} = JSON.parse(fs.readFileSync('package.json'))

const jsGlob = [
  'assets/js/components/*.js',
  'assets/js/controllers/*.js'
]
const jsFiles = vendor.concat(jsGlob)

/**
 * Connect
 */
const accountName = vtex.store
const environment = vtex.environment
const portalHost = `${accountName}.${environment}.com.br`
const imgProxyOptions = url.parse(`${vtex.protocol}://${accountName}.vteximg.com.br/arquivos`)
const portalProxyOptions = url.parse(`${vtex.protocol}://${portalHost}/`)

imgProxyOptions.route = '/arquivos'
portalProxyOptions.preserveHost = true
portalProxyOptions.cookieRewrite = `${accountName}.vtexlocal.com.br`

/**
 * Banner
 */
const bannerFiles = `/**
 * Avanti Comunicação <contato@penseavanti.com.br>
 * ${accountName}
 * @date <%= new Date() %>
 */\n\n`


//                                  _
//   ___ ___  _ __  _ __   ___  ___| |_
//  / __/ _ \| '_ \| '_ \ / _ \/ __| __|
// | (_| (_) | | | | | | |  __/ (__| |_
//  \___\___/|_| |_|_| |_|\___|\___|\__|

gulp.task('connect', () => {
  $.connect.server({
    hostname: '*',
    port: 80,
    debug: false,
    middleware: () => {
      return [
        middlewares.disableCompression,
        middlewares.rewriteLocationHeader(environment),
        middlewares.replaceHost(portalHost),
        middlewares.replaceReferer(environment, vtex.protocol, portalHost),
        middlewares.replaceHtmlBody(environment, vtex.protocol),
        httpPlease({
          host: portalHost,
          verbose: true
        }),
        serveStatic('./build'),
        proxy(imgProxyOptions),
        proxy(portalProxyOptions),
        middlewares.errorHandler
      ]
    },
    livereload: true
  })

  const openOptions = {
    uri: `http://${accountName}.vtexlocal.com.br/admin/Site/Login.aspx`,
    app: 'google chrome'
  }

  return gulp.src('./')
    .pipe($.open(openOptions));
})


//       _
//   ___| | ___  __ _ _ __
//  / __| |/ _ \/ _` | '_ \
// | (__| |  __/ (_| | | | |
//  \___|_|\___|\__,_|_| |_|

gulp.task('clean', () => {
  return del(['build/', 'deploy/'])
})


//    _                                _       _
//   (_) __ ___   ____ _ ___  ___ _ __(_)_ __ | |_
//   | |/ _` \ \ / / _` / __|/ __| '__| | '_ \| __|
//   | | (_| |\ V / (_| \__ \ (__| |  | | |_) | |_
//  _/ |\__,_| \_/ \__,_|___/\___|_|  |_| .__/ \__|
// |__/                                 |_|

gulp.task('js', ['js:main', 'js:legacy'])

gulp.task('js:main', () => {
  return gulp.src(jsFiles)
    .pipe($.sourcemaps.init())
    .pipe($.xo())
    .pipe($.xo.format())
    .pipe(
      $.babel()
        .on('error', function onError (error) {
          console.log(error)
          this.emit('end')
        })
    )
    .pipe($.concat(`${parseInt(version)}-${vtex.acronym}-${vtex.device}-application.js`))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('./build/arquivos/'))
})

gulp.task('js:legacy', () => {
  return gulp.src(['assets/js/*.js'])
    .pipe(gulp.dest('./build/arquivos/'))
    .pipe($.connect.reload())
})


//    _                                _       _                 _            _
//   (_) __ ___   ____ _ ___  ___ _ __(_)_ __ | |_            __| | ___ _ __ | | ___  _   _
//   | |/ _` \ \ / / _` / __|/ __| '__| | '_ \| __|  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
//   | | (_| |\ V / (_| \__ \ (__| |  | | |_) | |_  |_____| | (_| |  __/ |_) | | (_) | |_| |
//  _/ |\__,_| \_/ \__,_|___/\___|_|  |_| .__/ \__|          \__,_|\___| .__/|_|\___/ \__, |
// |__/                                 |_|                            |_|            |___/

gulp.task('js:deploy', () => {
  return gulp.src('./build/arquivos/*.js')
    .pipe($.stripComments())
    .pipe(
      $.babel()
        .on('error', function onError (error) {
          console.log(error)
          this.emit('end')
        })
    )
    .pipe($.uglify())
    .pipe($.header(bannerFiles))
    .pipe(gulp.dest('./deploy/js/'))
    .pipe($.connect.reload())
})


//      _         _
//  ___| |_ _   _| | ___  ___
// / __| __| | | | |/ _ \/ __|
// \__ \ |_| |_| | |  __/\__ \
// |___/\__|\__, |_|\___||___/
//          |___/

gulp.task('sass', () => {
  return gulp.src('assets/css/**/*.scss')
    .pipe($.compass({
      css: __dirname +'/build/arquivos/',
      sass: __dirname +'/assets/css/',
      image: __dirname +'/assets/img/',
      generated_images_path: __dirname +'/build/arquivos/',
      relative_assets: true,
      sourcemap: true
    }))
    .on('error', function onError (error) {
      console.log(error)
      this.emit('end')
    })
    .pipe(gulp.dest('./build/arquivos/'))
    .pipe($.connect.reload())
})

gulp.task('css', () => {
  return gulp.src('assets/css/*.css')
    .pipe(gulp.dest('./build/arquivos/'))
    .pipe($.connect.reload())
})


//      _         _                         _            _
//  ___| |_ _   _| | ___  ___            __| | ___ _ __ | | ___  _   _
// / __| __| | | | |/ _ \/ __|  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
// \__ \ |_| |_| | |  __/\__ \ |_____| | (_| |  __/ |_) | | (_) | |_| |
// |___/\__|\__, |_|\___||___/          \__,_|\___| .__/|_|\___/ \__, |
//          |___/                                 |_|            |___/

gulp.task('sass:deploy', () => {
  return gulp.src('build/arquivos/*.css')
    .pipe($.cssmin())
    .on('error', function onError (error) {
      console.log(error)
      this.emit('end')
    })
    .pipe($.header(bannerFiles))
    .pipe(gulp.dest('./deploy/css/'))
})


//  _
// (_)_ __ ___   __ _
// | | '_ ` _ \ / _` |
// | | | | | | | (_| |
// |_|_| |_| |_|\__, |
//              |___/

gulp.task('img', () => {
  return gulp.src('assets/img/*.{jpg,png,gif}')
    .pipe(gulp.dest('./build/arquivos/'))
    .pipe($.connect.reload())
})


//  _                               _            _
// (_)_ __ ___   __ _            __| | ___ _ __ | | ___  _   _
// | | '_ ` _ \ / _` |  _____   / _` |/ _ \ '_ \| |/ _ \| | | |
// | | | | | | | (_| | |_____| | (_| |  __/ |_) | | (_) | |_| |
// |_|_| |_| |_|\__, |          \__,_|\___| .__/|_|\___/ \__, |
//              |___/                     |_|            |___/

gulp.task('img:deploy', () => {
  return gulp.src('build/arquivos/*.{png,jpg,gif}')
    .pipe(
      $.imagemin({
        interlaced: true,
        progressive: true,
        optimizationLevel: 5
      },
      {
        verbose: true
      })
    )
    .pipe(gulp.dest('./deploy/img/'))
})


//                _       _
// __      ____ _| |_ ___| |__
// \ \ /\ / / _` | __/ __| '_ \
//  \ V  V / (_| | || (__| | | |
//   \_/\_/ \__,_|\__\___|_| |_|

gulp.task('watch', () => {
  const jsWatch = Object.assign([], jsFiles)
  jsWatch.push('vendor.js')

  gulp.watch(jsWatch, ['js'])
  gulp.watch(['assets/css/*.css'], ['css'])
  gulp.watch(['assets/css/**/*.scss', 'assets/img/sprite/*.png'], ['sass'])
  gulp.watch(['assets/img/*.{jpg,png,gif}'], ['img'])
})


//  _           _ _     _
// | |__  _   _(_) | __| |
// | '_ \| | | | | |/ _` |
// | |_) | |_| | | | (_| |
// |_.__/ \__,_|_|_|\__,_|

gulp.task('build', ['js', 'sass', 'css', 'img'])


//      _            _
//   __| | ___ _ __ | | ___  _   _
//  / _` |/ _ \ '_ \| |/ _ \| | | |
// | (_| |  __/ |_) | | (_) | |_| |
//  \__,_|\___| .__/|_|\___/ \__, |
//            |_|            |___/

gulp.task('deploy', done => {
  return runSequence('clean', 'build', ['js:deploy', 'sass:deploy', 'img:deploy'], done)
})


//      _       __             _ _
//   __| | ___ / _| __ _ _   _| | |_
//  / _` |/ _ \ |_ / _` | | | | | __|
// | (_| |  __/  _| (_| | |_| | | |_
//  \__,_|\___|_|  \__,_|\__,_|_|\__|

gulp.task('default', done => {
  return runSequence('clean', ['connect', 'build', 'watch'], done)
})
