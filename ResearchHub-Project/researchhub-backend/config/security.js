const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    const error = new Error(
      "JWT_SECRET must be configured with at least 32 characters before authentication can be used.",
    );
    error.code = "AUTH_CONFIGURATION_ERROR";
    throw error;
  }

  return secret;
};

module.exports = { getJwtSecret };
