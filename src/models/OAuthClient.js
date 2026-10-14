import mongoose from 'mongoose';
import crypto from 'crypto';

const OAuthClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  clientName: { type: String, default: 'MCP Client' },
  redirectUris: [{ type: String }],
  grantTypes: [{ type: String }],
  tokenEndpointAuthMethod: { type: String, default: 'none' },
}, { timestamps: true });

OAuthClientSchema.statics.generateClientId = function () {
  return `pw_client_${crypto.randomBytes(16).toString('hex')}`;
};

// Returns the registered client only if redirectUri is one of its registered
// redirect URIs, else null. Centralizes the check used by /authorize and /approve
// so an authorization code can never be delivered to an unregistered redirect URI.
OAuthClientSchema.statics.findForRedirect = async function (clientId, redirectUri) {
  if (typeof clientId !== 'string' || typeof redirectUri !== 'string' || !clientId || !redirectUri) return null;
  const client = await this.findOne({ clientId }).lean();
  if (!client || !Array.isArray(client.redirectUris)) return null;
  return client.redirectUris.includes(redirectUri) ? client : null;
};

OAuthClientSchema.statics.isValidRedirect = async function (clientId, redirectUri) {
  return !!(await this.findForRedirect(clientId, redirectUri));
};

export default mongoose.models.OAuthClient || mongoose.model('OAuthClient', OAuthClientSchema);
