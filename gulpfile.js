var gulp = require('gulp');
var browserSync = require('browser-sync');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('serve', ['sass', 'dist'], function () {
    browserSync.init({
        server: {
            baseDir: './'
        },
        open: false,
        online: false,
        notify: false
    });

    gulp.watch('scss/*.scss', ['sass']);
    gulp.watch('js/momentum-slider.js', ['dist']);
    gulp.watch(['**/*.html', 'js/*']).on('change', browserSync.reload);
});

gulp.task('sass', function () {
    return gulp.src('scss/*.scss')
        .pipe(sass({
            outputStyle: 'expanded',
            includePaths: ['scss']
        }))
        .pipe(prefix(['last 5 versions'], { cascade: true }))
        .pipe(gulp.dest('css'))
        .pipe(browserSync.reload({ stream: true }));
});

gulp.task('dist', function () {
    return gulp.src('js/momentum-slider.js')
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['serve']);
