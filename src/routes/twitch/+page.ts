// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

import type { PageLoad } from '../$types';

// export const load: PageLoad = async ({ fetch, params }) => {
// 	const res = await fetch(`/getConfig`);
// 	const item = await res.json();

// 	return { item };
// };