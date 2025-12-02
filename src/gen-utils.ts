export function trimObject(obj: Object): Object {
	return Object.fromEntries(
		Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
	);
}

export function byteSize(bytes: number, si = true, dp = 1): string {
    const thresh = (si) ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
  
    const units = si 
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
  
    return bytes.toFixed(dp) + ' ' + units[u];
}

export function titleCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getCategoryName(category: string): string {
  return category.replace(/\//ig, '-');
}

const LAST_UPDATED = (new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export function getLastUpdated() {
  return LAST_UPDATED;
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getFormattedWebsite(url: string) {
  try {
      let u = new URL(url);
      let host = u.hostname;
      if (host.toLowerCase().startsWith('www.')) {
        return host.substring(4);
      } return host;
  } catch (e) {
      return url;
  }
}

export function getDeveloperUrlPath(developer: string): string {
  return developer
    .replace(/[,]/ig, ' ')
    .replace(/ +(?= )/ig, '')
    .replace( /\s/ig, '_')
    .replace(/[.\/#!$%\^&\*;:{}=\-_`~()]/ig, '')
    .replace(/[^a-z0-9]/ig, '_')
    .toLocaleLowerCase()
    .trim();
}

export function quoteattr(s: string): string {
  const preserveCR = '\n';
  return ('' + s)
      .replace(/&/g, '&amp;')
      .replace(/'/g, '&apos;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n/g, preserveCR)
      .replace(/[\r\n]/g, preserveCR);
}
