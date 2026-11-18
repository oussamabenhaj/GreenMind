import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

/**
 * US-G08 — fetches the printable HTML with the Bearer token and opens it in
 * a new tab (the page triggers window.print() itself).
 */
export async function printDocument(resource, id) {
  const tab = window.open('', '_blank');
  try {
    const res = await axios.get(endpoints.print(resource, id), {
      params: { autoprint: true },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
  } catch (error) {
    tab?.close();
    window.alert(error.message ?? 'Impression impossible');
  }
}
