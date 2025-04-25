const render = require("./lib/render");
const hexoWrapper = require("./lib/hexoWrapper");
const defaultConfig = 'kroki';

/**
 * make url for a diagram
 *
 * see https://docs.kroki.io/kroki/setup/encode-diagram/
 * @param {string}server server's url
 * @param {string}diagramType eg: vegalite, plantuml
 * @param {('svg'|'png')}format - url format
 * @param {string}diagram your diagram fragment to make the URL
 * @return {string} encoded URL
 */
function makeURL(server, diagramType, format, diagram) {
    // remove trailing slash
    server = server.replace(/\/$/, '')
    const pako = require('pako')
    const data = Buffer.from(diagram, 'utf8')
    const compressed = pako.deflate(data, {level: 9})
    var base64Str = Buffer.from(compressed).toString('base64');
    var newStr = render.urlSafe(base64Str, defaultConfig)
    return [server, diagramType, format, newStr].join('/');
}

hexoWrapper.register(
    defaultConfig,
    hexo,
    hexoWrapper.supportedDiagram[defaultConfig].matchRegexp,
    hexoWrapper.supportedDiagram[defaultConfig].diagTypes,
    (args, diagType, diagram, hexo) => {
        const mergedCfg = Object.assign(render.config, {
            server: "https://kroki.io",
            // the img generated will have a default class name.
            className: defaultConfig,
            darkClassName: defaultConfig + "-dark",
        }, hexo.config[defaultConfig])
        diagram_light = render.decorateDiagram(mergedCfg, diagType, diagram);
        var realUrlLight = makeURL(mergedCfg.server, diagType, mergedCfg.outputFormat, diagram_light);
        var promiseLight = render.serverSideRendering(mergedCfg, realUrlLight, false);

        if (!mergedCfg.darkModeEnabled) {
            return promiseLight
        }

        diagram_dark = render.decorateDiagram(mergedCfg, diagType + "-dark", diagram, hexo);
        var realUrlDark = makeURL(mergedCfg.server, diagType, mergedCfg.outputFormat, diagram_dark);
        var promiseDark = render.serverSideRendering(mergedCfg, realUrlDark, true);

        var promise_return = Promise.all([promiseLight, promiseDark]).then((results) => {
            return results[0] + results[1]
        })

        return promise_return
    }
)