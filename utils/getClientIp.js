function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const realIp = req.headers['x-real-ip']
  const ip = forwarded ? forwarded.split(',')[0] : realIp || req.connection.remoteAddress || req.socket.remoteAddress
  
  // Remove IPv6 prefix if present
  return ip ? ip.replace('::ffff:', '') : 'unknown'
}

module.exports = getClientIp
