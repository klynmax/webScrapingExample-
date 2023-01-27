const scraperObject = {
    url: 'http://books.toscrape.com',
    async scraper(browser, category){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        /**
         * Navegue até a página selecionada
         */
        await page.goto(this.url);
        // Select the category of book to be displayed
		let selectedCategory = await page.$$eval('.side_categories > ul > li > ul > li > a', (links, _category) => {

			// Search for the element that has the matching text
			links = links.map(a => a.textContent.replace(/(\r\n\t|\n|\r|\t|^\s|\s$|\B\s|\s\B)/gm, "") === _category ? a : null);
			let link = links.filter(tx => tx !== null)[0];
			return link.href;
		}, category);
		/**
         * Navegue até a categoria selecionada
         */
		await page.goto(selectedCategory);
        let scrapedData = [];
        /**
         * Aguarde até que o DOM necessário seja renderizado
         */
        async function scrapeCurrentPage(){
            await page.waitForSelector('.page_inner');
            /**
             * Obtenha o link para todos os livros necessários
             */
            let urls = await page.$$eval('section ol > li', links => {
                /**
                 * Verifique se o livro a ser raspado está em estoque
                 */
                links = links.filter(link => link.querySelector('.instock.availability > i').textContent !== "In stock")
                /**
                 * Extraia os links dos dados
                 */
                links = links.map(el => el.querySelector('h3 > a').href)
                return links;
            });
            /**
             * Percorra cada um desses links, abra uma nova instância de página e obtenha os dados relevantes deles
             */
            let pagePromise = (link) => new Promise(async(resolve, reject) => {
                let dataObj = {};
                let newPage = await browser.newPage();
                await newPage.goto(link);
                dataObj['bookTitle'] = await newPage.$eval('.product_main > h1', text => text.textContent);
                dataObj['bookPrice'] = await newPage.$eval('.price_color', text => text.textContent);
                dataObj['noAvailable'] = await newPage.$eval('.instock.availability', text => {
                    /**
                     * Retirar novos espaços de linha e tabulação
                     */
                    text = text.textContent.replace(/(\r\n\t|\n|\r|\t)/gm, "");
                    /**
                     * Obter o número de estoque disponível
                     */
                    let regexp = /^.*\((.*)\).*$/i;
                    let stockAvailable = regexp.exec(text)[1].split(' ')[0];
                    return stockAvailable;
                });
                dataObj['imageUrl'] = await newPage.$eval('#product_gallery img', img => img.src);
                dataObj['bookDescription'] = await newPage.$eval('#product_description', div => div.nextSibling.nextSibling.textContent);
                dataObj['upc'] = await newPage.$eval('.table.table-striped > tbody > tr > td', table => table.textContent);
                resolve(dataObj);
                await newPage.close();
            });

            for(link in urls){
                let currentPageData = await pagePromise(urls[link]);
                scrapedData.push(currentPageData);
                // console.log(currentPageData);
            }
            /**
             * Quando todos os dados desta página estiverem concluídos, clique no botão Avançar e inicie a raspagem da próxima página
             */
            
            /**
             * Você vai verificar primeiro se esse botão existe, para saber se realmente existe uma próxima página.
             */
            let nextButtonExist = false;
            try{
                const nextButton = await page.$eval('.next > a', a => a.textContent);
                nextButtonExist = true;
            }
            catch(err){
                nextButtonExist = false;
            }
            if(nextButtonExist){
                await page.click('.next > a');   
                return scrapeCurrentPage(); // Chame esta função recursivamente
            }
            await page.close();
            return scrapedData;
        }
        let data = await scrapeCurrentPage();
        console.log(data);
        return data;
    }
}


module.exports = scraperObject;