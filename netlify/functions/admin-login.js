exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          token: ADMIN_TOKEN
        })
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: "Invalid login"
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Server error"
      })
    };
  }
};
