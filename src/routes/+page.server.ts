import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// ログイン済みならダッシュボードへ、未ログインならログインページへ
	if (locals.userId) {
		throw redirect(303, '/dashboard');
	} else {
		throw redirect(303, '/login');
	}
};
