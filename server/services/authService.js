const { verifyPassword, DUMMY_HASH } = require('../utils/password');
const { unauthorized, forbidden } = require('../utils/errors');
const v = require('../utils/validate');
const { toPublicUser } = require('./mappers');

module.exports = ({ users, tokens }) => ({
  login(body) {
    const email = v.email(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const user = users.findByEmail(email);
    // Always run a hash comparison so timing doesn't reveal whether the email exists.
    const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Invalid email or password');
    if (!user.active) throw forbidden('This account has been deactivated. Contact your administrator.');
    users.touchLogin(user.id);
    return { token: tokens.issue(user), user: toPublicUser(users.findById(user.id)) };
  },
  // Resolve a bearer token to an active user (used by auth middleware).
  authenticate(token) {
    const data = tokens.verify(token);
    if (!data) throw unauthorized('Session is invalid or has expired');
    const user = users.findById(data.sub);
    if (!user || !user.active) throw unauthorized('Account inactive or not found');
    return user;
  },
});
