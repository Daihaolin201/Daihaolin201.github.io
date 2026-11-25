import type { APIRoute } from 'astro';
import en from '../data/en.json';
import { buildVcard } from '../lib/vcard';

export const GET: APIRoute = ({ site }) => new Response(buildVcard(site!, en.contact.profiles), {
  headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
});
