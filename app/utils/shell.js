function escape(string) {
  return (string || '').replace(/(["\s'$`\\])/g, '\\$1');
}

exports.escape = escape;
