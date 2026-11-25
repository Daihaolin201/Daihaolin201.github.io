/** Rate-limit key for an address: IPv4 as is, IPv6 reduced to its /64 so one provider allocation is one visitor. */
export function addrBucket(ip: string): string {
  if (!ip.includes(':')) return ip;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  const [head, tail] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return groups.slice(0, 4).map(g => g.padStart(4, '0').toLowerCase()).join(':') + '::/64';
}
