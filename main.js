var apiEndpointIds = 'https://axwhyzee.pythonanywhere.com/get_ids/?n=';
var apiEndpointFreq = 'https://axwhyzee.pythonanywhere.com/get_freq/?ids=';
var loadingText = document.getElementById('loading-text');
var display = document.getElementById('central-display');
var dateMenu = document.getElementById('date-tabs-menu');
var dateTabs = document.getElementById('date-tabs-ul');
var barplots = document.getElementById('bar-plots');
var yaxis = document.getElementById('y-axis');
var today = new Date();
var activeBar = 0;
var combined = {};
var activeDate;
var todayDate;
var numBars;

const post_count = 500;
const posts_per_request = 25;

function loading() {
	document.getElementById('loading-wheel').style.display = 'Block';
}

async function getIds(n) {
	const response = await fetch(apiEndpointIds + n);
	const ids = await response.json();
	
	return ids
}

async function getFrequency(arg) {
	const response = await fetch(apiEndpointFreq + arg);
	const data = await response.json();
	
	return data
}

function strftime(datetime) {
	return ('0' + datetime.getDate()).slice(-2) + '-' + ('0' + (datetime.getMonth() + 1)).slice(-2) + '-' + datetime.getFullYear()
}

function showTicker(e) {
	const dataValue = e.target.getAttribute('data-value');
	
	display.innerHTML = dataValue.toUpperCase();
	id = e.target.id;
	
	document.getElementById('bar-id-'+activeBar).classList.remove('active-bar');
	e.target.classList.add('active-bar');
	activeBar = id.substring(id.lastIndexOf('-')+1, id.length+1);
}

function mergeFreqLists(a, b) {
	let c = {};
	for (var date in b) {
		if (!(date in a)) {
			a[date] = {};
		}
		
		for (var ticker in b[date]) { 
			if (!(ticker in a[date])) {
				a[date][ticker] = 0;
			}
			a[date][ticker] += b[date][ticker];
		}
	}
	
	// sort by value
	for (var date in a) {
		c[date] = {};
		let tickers = Object.keys(a[date]);
		while (tickers.length > 0) {
			let maxTicker = tickers[0];

			for (let i=1; i<tickers.length; i++) {
				if (a[date][tickers[i]] > a[date][maxTicker]) {
					maxTicker = tickers[i];
				}
			}
			c[date][maxTicker] = a[date][maxTicker];
			delete a[date][maxTicker];
			
			tickers = Object.keys(a[date]);
		}
	}
	return c;
}

function animateGrow() {
	let children = barplots.children;
	for (let i=0; i<children.length; i++) {
		children[i].classList.remove('bar-col-suppress');
	}
}

function animateShrink() {
	let children = barplots.children;
	for (let i=0; i<children.length; i++) {
		children[i].classList.add('bar-col-suppress');
	}
}

async function chunking(combinedFreq, ids) {
	let arg = '';
	let count = 0;
	if (ids.length>0) {
		while (count<posts_per_request && ids.length>0) {
			arg += ids.shift() + '-';
			count++;
		}
			
		// remove last '-'
		arg = arg.substring(0, arg.length-1);
		
		activeBar = 0;
		loadingText.innerHTML = 'Scraping [' + ids.length +'] Posts';
	
		const freqList = await getFrequency(arg);
		combined = mergeFreqLists(combinedFreq, freqList);
		
		if (todayDate in combined) resetGraph(combined[todayDate]);
		
		const timeout = setTimeout(function() {
			chunking(combined, ids);
		}, 2200);
	} else {
		document.getElementById('loading-container').remove();
		delete loadingText;
		createNavTabs();
	}
}

function resetGraph(freqList) {
	// animate shrinking bars
	const delayShrink = setTimeout(function() {
		animateShrink();
	}, 100);

	const delayCreate = setTimeout(function() {
		// delete all child elements
		barplots.innerHTML = '';
		yaxis.innerHTML = '';
		activeBar = 0;
		
		createGraph(freqList);
		
		if (numBars>0) {
			const active = document.getElementById('bar-id-0');
			
			active.classList.add('active-bar');
			display.innerHTML = active.getAttribute('data-value');
		}
	}, 1100);
	
	// animate growing bars
	const delayGrow = setTimeout(function() {
		animateGrow();
	}, 1200);
}

function createGraph(freqList) {
	const keys = Object.keys(freqList)
	const yintervals = 4;
	let limit = keys.length;
	let count = 0;
	
	if (keys.length > 0) {
		const maxFreq = Object.values(freqList)[0];
		
		if(document.body.offsetWidth < 360) limit = Math.min(30, keys.length);
		else if (document.body.offsetWidth < 640) limit = Math.min(50, keys.length);
		
		for (let j=0; j<limit; j++) {
			const column = document.createElement('div');
			const bar = document.createElement('div');

			column.className = 'bar-col bar-col-suppress';
			column.style.height = (98 * freqList[keys[j]] / maxFreq + 2) + '%';
			column.style.width = (100 / limit) + '%';
			column.style.transition = (Math.random() / 2 + .5) + 's';
			column.addEventListener('mouseover', showTicker);
			
			bar.id = 'bar-id-' + count;
			bar.className = 'bar';
			bar.setAttribute('data-value', keys[j].toUpperCase());

			column.appendChild(bar)
			barplots.appendChild(column);	
				
			count++;
		}
		
		numBars = count;
			
		for (let i=0; i<yintervals; i++) {
			const ytick = document.createElement('div');
				
			ytick.style.height = (100 / yintervals) + '%';
			ytick.innerHTML = Math.round(maxFreq - (maxFreq*i/yintervals));
			ytick.className = 'y-tick';
			yaxis.appendChild(ytick);
		}
	}
}

function navTabClick(e) {
	const navDate = e.target.innerHTML;
	const id = e.target.id;
	
	document.getElementById('date-id-'+activeDate).classList.remove('date-tab-active');
	e.target.classList.add('date-tab-active');
	activeDate = id.substring(id.lastIndexOf('-')+1, id.length+1);
	
	dateMenu.style.top = '100%';
	resetGraph(combined[navDate]);
}

function createNavTabs() {
	let availDates = Object.keys(combined);
	if (availDates.length > 0) {
		for (let i=0; i<availDates.length; i++) {
			const dateTabLi = document.createElement('li');
			const dateTabDiv = document.createElement('div');
			
			dateTabLi.classList.add('date-tab-container');
			dateTabLi.style.width = (100 / availDates.length) + '%';
			
			dateTabDiv.id = 'date-id-' + i;
			dateTabDiv.classList.add('date-tab');
			dateTabDiv.innerHTML = availDates[i];
			dateTabDiv.addEventListener('click', navTabClick);	
			
			dateTabLi.appendChild(dateTabDiv);
			dateTabs.appendChild(dateTabLi);
		}
		activeDate = 0;
		document.getElementById('date-id-0').classList.add('date-tab-active');
	}
}

function toCorner() {
	const loadingContainer = document.getElementById('loading-container');
	const blackScreen = document.getElementById('black-screen');
	const docBody = document.body;
	const length = 100;
	const hypothenuse = Math.sqrt(2*length*length);
	
	if (docBody.offsetWidth > docBody.offsetHeight) {
		blackScreen.style.height = '300vw';
		blackScreen.style.width = '300vw';
	} else {
		blackScreen.style.height = '300vh';
		blackScreen.style.width = '300vh';
	}
	
	if (docBody.offsetWidth < 640) {
		loadingText.style.display = 'none';
		document.getElementById('loading-icon').style.display = 'none';
	} else {
		loadingContainer.style.top = '0';
		loadingContainer.style.left = '100%';
		loadingContainer.style.transform = 'translate(-'+hypothenuse+'px, '+(hypothenuse-length)+'px)';
		console.log('translate(-'+hypothenuse+'px, '+(hypothenuse-length)+'px)');
		loadingContainer.style.width = length+'px';
		loadingContainer.style.height = length+'px';
	}
	
	const delayBackground = setTimeout(function() {
		docBody.style.backgroundColor = '#333';
		blackScreen.remove();
	}, 1500);
}

async function main() {
	loadingText.innerHTML = 'Fetching posts IDs ...';
	
	console.log('Geting IDs ...');
	const ids = await getIds(post_count);
	console.log('Fetched ' + ids.length + ' IDs');
	toCorner();
	
	chunking(combined, ids);
	
	body = document.body;
	body.addEventListener('wheel', shuffle);	
}

function shuffle(e) {
	document.getElementById('bar-id-' + activeBar).classList.remove('active-bar');
	
	if (e.deltaY > 0) activeBar++;
	else activeBar--;

	if (activeBar >= numBars) activeBar = 0;
	else if (activeBar < 0) activeBar = numBars-1;
	
	const bar = document.getElementById('bar-id-' + activeBar);
	display.innerHTML = bar.getAttribute('data-value');
	bar.classList.add('active-bar');
}

function toggleMenu() {
	if (dateMenu.style.top == '' || dateMenu.style.top == '100%') dateMenu.style.top = '0';
	else dateMenu.style.top = '100%';
	
}

document.getElementById('menu-icon').addEventListener('click', toggleMenu);

today.setDate(today.getDate() - 1);
todayDate = strftime(today);

main();
