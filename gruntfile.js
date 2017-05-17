module.exports = function (grunt) {
    "use strict";

    grunt.initConfig({
        ts: {
            server: {
                files: [{
                    src: ["src/**/*.ts", "!src/client/**/*.ts"],
                    dest: "dist/"
                }],
                options: {
                    module: "commonjs",
                    noLib: false,
                    target: "es5",
                    sourceMap: false
                }
            }
        },
        tslint: {
            options: {
                configuration: "tslint.json"
            },
            server: {
                src: ["src/**/*.ts"]
            }
        },
        run: {
            options: {
                // Task-specific options go here.
            },
            server: {
                cmd: 'node',
                args: [
                    'dist/main.js'
                ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks('grunt-run');

    grunt.registerTask("default", [
        "ts",
        "tslint"
    ]);

    grunt.registerTask("server", [
        "tslint:server",
        "ts:server",
        "run:server"
    ]);

};