'use strict';

import babelify     from 'babelify';
import browserSync  from 'browser-sync';
import browserify   from 'browserify';
import del          from 'del';
import gulp         from 'gulp';
// import babel        from 'gulp-babel';
import eslint       from 'gulp-eslint';
// import gulpIf from 'gulp-if';
import minifyCss    from 'gulp-minify-css';
import minifyHtml   from 'gulp-minify-html';
// import newer        from 'gulp-newer';
import sass         from 'gulp-sass';
import sourcemaps   from 'gulp-sourcemaps';
import uglify       from 'gulp-uglify';
import runSequence  from 'run-sequence';
import watchify     from 'watchify';
import buffer       from 'vinyl-buffer';
import source       from 'vinyl-source-stream';
// import merge      from 'utils-merge';
// import rename     from 'gulp-rename';

const reload = browserSync.reload;
const bootstrap = 'node_modules/bootstrap-sass/';

gulp.task('copy', () =>
  gulp.src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'))
);

gulp.task('copy:nm', () =>
  gulp.src([
    bootstrap + 'assets/fonts/**/*'
  ], {
    base: 'node_modules',
    dot: true
  })
  .pipe(gulp.dest('.tmp'))
  .pipe(gulp.dest('dist'))
);

// Clean output directory
// gulp.task('clean', cb => del(['.tmp', 'dist/*', '!dist/.git'], {dot: true}));
gulp.task('clean', () => del(['.tmp', 'dist/*', '!dist/.git'], {dot: true}));

gulp.task('styles', () => {
  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src(['app/styles/main.scss'])
  // .pipe(newer('.tmp/styles'))
  .pipe(sourcemaps.init())
  .pipe(sass({
    precision: 10,
    includePaths: [bootstrap + 'assets/stylesheets']
  }).on('error', sass.logError))
  // .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
  .pipe(gulp.dest('.tmp/styles'))
  // Concatenate and minify styles
  // .pipe(gulpIf('*.css', minifyCss()))
  .pipe(minifyCss())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist/styles'));
});

gulp.task('lint', () =>
  gulp.src(['app/scripts/**/*.js', 'gulpfile.babel.js'])
  .pipe(eslint({
    rules: {
      'no-multi-spaces': [2, {exceptions: {
        // Property:           true,
        VariableDeclarator: true,
        ImportDeclaration: true
      }}]
    }
  }))
  .pipe(eslint.format())
  // .pipe(gulpIf(!browserSync.active, eslint.failOnError()))
  .pipe(eslint.failOnError())
);

gulp.task('lint:gulpfile', () =>
  gulp.src(['gulpfile.babel.js'])
  .pipe(eslint())
  .pipe(eslint.format())
  // .pipe(gulpIf(!browserSync.active, eslint.failOnError()))
  .pipe(eslint.failOnError())
);

/*
gulp.task('scripts', () =>
  gulp.src(['./app/scripts/main.js'])
  // .pipe(newer('.tmp/scripts'))
  .pipe(sourcemaps.init())
  // .pipe(babel())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('.tmp/scripts'))
  // .pipe(concat('main.min.js'))
  .pipe(uglify({preserveComments: 'some'}))
  // Output files
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('dist/scripts'))
);
*/

gulp.task('watchify', () => {
  const browserifyOpts = {
    entries: './app/scripts/main.js',
    // basedir: './',
    cache: {},
    packageCache: {},
    debug: true,
    plugin: [watchify],
    transform: [babelify]
    // transform: babelify.configure({presets: ["es2015", "react", "stage-2"]}),
  };

  let bundler = browserify(browserifyOpts);
  // let bundler = watchify(browserify(browserifyOpts));

  let execBundle = () => {
    let time = process.hrtime();
    return bundler
    .bundle()
    .on('error', err => console.log('Bundle error:', err))
    .pipe(source('main.js'))
    .pipe(buffer())
    // .pipe( sourcemaps.init( { loadMaps: true } ) )
    .pipe(sourcemaps.init())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/scripts'))
    .on('end', () => {
      let t = process.hrtime(time);
      console.log('Bundled:', t[0] + '.' + t[1] + 's');
    })
    .pipe(reload({stream: true, once: true}));
  };
  bundler.on('update', execBundle);
  return execBundle();
});

// Scan your HTML for assets & optimize them
gulp.task('html', () => {
  return gulp.src('app/**/*.html')
  .pipe(minifyHtml())
  .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['scripts', 'styles'], () => {
  gulp.watch(['app/styles/**/*.{scss,css}'], ['styles']);
  gulp.watch(['app/scripts/**/*.js'], ['scripts']);
});

// Watch files for changes & reload
gulp.task('serve', ['copy:nm', 'scripts', 'styles'], () => {
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: ['.tmp', 'app'],
    port: 3000
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['app/scripts/**/*.js'], ['lint', 'scripts']);
  // gulp.watch(['app/images/**/*'], reload);
});

gulp.task('serve:w', ['copy:nm', 'watchify', 'styles'], () => {
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: ['.tmp', 'app'],
    port: 3000
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.{scss,css}'], ['styles', reload]);
  // gulp.watch(['app/scripts/**/*.js'], ['lint', 'watchify']);
  gulp.watch(['app/scripts/**/*.js'], ['lint']);
  // gulp.watch(['app/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], () =>
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: 'dist',
    port: 3001
  })
);

// Build production files, the default task
gulp.task('default', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'copy', 'copy:nm'],
    cb
  )
);
