'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var inquirer = require('inquirer');

gulp.task('default', function (done) {
  var questions = [
    {
      name: 'storeName',
      message: 'Qual o "username" da loja? (Ex.: labellamafia)',
      default: 'labellamafia'
    },
    {
      name: 'storeAcronym',
      message: 'Qual a sigla da loja? (Ex.: lbm)',
      default: 'lbm'
    }
  ];

  var filterImages = $.filter(['**/**', '!template/assets/img/', '!template/assets/img/**'], { restore: true });
  var filterGulp = $.filter(['**/**', '!template/gulpfile.babel.js'], { restore: true });

  inquirer.prompt(questions)
    .then(function (answers) {
      gulp.src(['template/**'], { cwd: __dirname, dot: true })
        .pipe(filterImages)
        .pipe(filterGulp)
        .pipe($.template(answers, { interpolate: /<%=([\s\S]+?)%>/g }))
        .pipe(filterImages.restore)
        .pipe(filterGulp.restore)
        .pipe($.rename(function (file) {
          if (file.basename[0] === '@') {
            file.basename = '.' + file.basename.slice(1)
          }

          if (file.basename.indexOf('-acronym-') > -1) {
            file.basename = file.basename.replace('acronym', answers.storeAcronym);
          }
        }))
        .pipe($.conflict('./'))
        .pipe(gulp.dest('./'))
        .on('finish', function () {
          done()
        })
    });
});
