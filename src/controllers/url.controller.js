import prisma from "../config/db.js";
import redis from "../config/redis.js";
import crypto from "crypto";

// Generate a short code
const generateShortCode = () => {
  return crypto.randomBytes(4).toString("base64url");
};

// POST /api/urls
export const createUrl = async (req, res) => {
  try {
    const { originalUrl, expiresAt } = req.body;
    console.log('this is the url: ', originalUrl);

    if (!originalUrl) {
      return res.status(400).json({
        message: "Original URL is required",
      });
    }

    try {
      new URL(originalUrl);
    } catch {
      return res.status(400).json({
        message: "Invalid URL",
      });
    }

    let shortCode;

    // Make sure generated short code is unique
    while (true) {
      const generatedCode = generateShortCode();

      const existingUrl = await prisma.url.findUnique({
        where: {
          shortCode: generatedCode,
        },
      });

      if (!existingUrl) {
        shortCode = generatedCode;
        break;
      }
    }

    const url = await prisma.url.create({
      data: {
        originalUrl,
        shortCode,
        userId: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Cache the newly created URL
    console.log('seending the url but it si nott seting')
    await redis.set(
      `url:${shortCode}`,
      originalUrl,
      {
        EX: 60 * 60,
      }
    );
    // const res= await redis.get(`url:${shortCode}`)
    // console.log('this isi the response from res:-- ', res)
    await redis.set('success11', "not success")
    const response= await redis.get('foo')
    console.log('this is the response:- ', response)

        const responseq= await redis.get('success11')
    console.log('this is the response:- ', responseq)
    console.log('success')

    return res.status(201).json({
      message: "URL shortened successfully",
      url: {
        id: url.id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        expiresAt: url.expiresAt,
        shortUrl: `${process.env.APP_URL}/${url.shortCode}`,
      },
    });
  } catch (error) {
    console.error("Create URL error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET /api/urls
export const getUrls = async (req, res) => {
  try {
    const urls = await prisma.url.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        originalUrl: true,
        shortCode: true,
        clicks: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const formattedUrls = urls.map((url) => ({
      ...url,
      shortUrl: `${process.env.APP_URL}/${url.shortCode}`,
    }));

    return res.status(200).json({
      urls: formattedUrls,
    });
  } catch (error) {
    console.error("Get URLs error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET /api/urls/:id
export const getUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const url = await prisma.url.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!url) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    return res.status(200).json({
      url: {
        ...url,
        shortUrl: `${process.env.APP_URL}/${url.shortCode}`,
      },
    });
  } catch (error) {
    console.error("Get URL error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE /api/urls/:id
export const deleteUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const url = await prisma.url.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!url) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    await prisma.url.delete({
      where: {
        id: url.id,
      },
    });

    // Important Redis concept:
    // Remove stale cached data after deleting the database record.
    await redis.del(`url:${url.shortCode}`);

    return res.status(200).json({
      message: "URL deleted successfully",
    });
  } catch (error) {
    console.error("Delete URL error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET /:shortCode
export const redirectUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // 1. Check Redis
    const cachedUrl = await redis.get(`url:${shortCode}`);

    if (cachedUrl) {
      console.log("Redis cache HIT");

      // Increment click counter
      await prisma.url.update({
        where: {
          shortCode,
        },
        data: {
          clicks: {
            increment: 1,
          },
        },
      });

      return res.redirect(cachedUrl);
    }

    console.log("Redis cache MISS");

    // 2. Redis didn't have the URL.
    // Look in PostgreSQL.
    const url = await prisma.url.findUnique({
      where: {
        shortCode,
      },
    });

    if (!url) {
      return res.status(404).json({
        message: "Short URL not found",
      });
    }

    // 3. Check expiration
    if (url.expiresAt && new Date() > url.expiresAt) {
      return res.status(410).json({
        message: "This short URL has expired",
      });
    }

    // 4. Put URL into Redis
    await redis.set(
      `url:${shortCode}`,
      url.originalUrl,
      {
        EX: 60 * 60,
      }
    );

    // 5. Increment clicks
    await prisma.url.update({
      where: {
        id: url.id,
      },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    // 6. Redirect
    return res.redirect(url.originalUrl);
  } catch (error) {
    console.error("Redirect URL error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};