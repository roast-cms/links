// @ts-nocheck
import * as express from "express";
import * as redis from "redis";
import * as session from "express-session";
import * as connectRedis from "connect-redis";

import Links from "./models/links";
import { Request, Response } from "express";

require("dotenv").config();

/**
  Returns Express router middleware.
*/
const tool = ({ pathName }: { pathName: string | undefined }) => {
  const redisURL = process.env.REDIS_URL;
  const databaseURI = process.env.DATABASE_URI;
  const applicationSecret = process.env.APPLICATION_SECRET;

  if (!redisURL || !databaseURI || !applicationSecret)
    throw {
      error:
        "Required `redisURL`, `databaseURI`, or `applicationSecret` missing from `.env` file.",
    };

  // set up Redis connection.
  const expressApp = express();
  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient({
    url: redisURL,
  });
  expressApp.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: applicationSecret,
      resave: false,
      saveUninitialized: false,
    })
  );

  return expressApp.get(
    `${pathName || "/link"}/:link`,
    async (req: Request, res: Response) => {
      // query
      const linkID = req.params.link;
      const linkTag = req.query.tag;
      const isGroupRequest = linkTag && linkID === "group";
      const dbDocument = isGroupRequest
        ? await Links.find({ tags: { $in: [linkTag] } })
        : await Links.findOne({ link: linkID })
            .cache(60 * 10) // cache links for 10 min
            .exec();

      // group/list of links with a particular tag
      if (isGroupRequest && dbDocument.length) {
        return res.json({
          status: 200,
          tag: linkTag,
          group: dbDocument.map(({ vendors, link, tags }) => ({
            vendors,
            link,
            tags,
          })),
        });
      }

      // document not found
      if (!dbDocument || !dbDocument._doc)
        return res.status(404).json({
          status: 404,
        });

      // unwraps the response
      const doc = Object.assign({}, dbDocument._doc);

      /**
        Sorts vendors based on value you assign to them & pics top-valued one.
      */
      const topValuedVendor = doc.vendors.sort(
        (firstVendor: number, secondVendor: number) => {
          if (firstVendor.value < secondVendor.value) return 1;
          if (firstVendor.value > secondVendor.value) return -1;
          return 0;
        }
      )[0];

      // successful API response
      return res.json({
        status: 200,
        link: doc.link,
        vendor: {
          url: topValuedVendor.url,
          locale: topValuedVendor.locale,
          name: topValuedVendor.name,
          // you may not want to share the vale you place on various vendors
        },
      });
    }
  );
};

export default tool;
