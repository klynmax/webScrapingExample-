const browserObject = require('./browser');
const scraperController = require('./pageController');

// Inicia o navegador e cria uma instancia
let browserInstance = browserObject.startBrowser();

scraperController(browserInstance);