import { PrismaClient } from "@prisma/client";
import passport from "passport";
import bcrypt from "bcryptjs";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const prisma = new PrismaClient();

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Fetch the user object from your database using the ID
    const user = await prisma.users.findUnique({
      where: { userId: id as string },
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.users.findUnique({
          where: { email: profile.emails![0].value },
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(
          profile.emails![0].value,
          salt
        );

        if (!user) {
          user = await prisma.users.create({
            data: {
              email: profile.emails![0].value,
              password: hashedPassword,
            },
          });

          await prisma.profiles.create({
            data: {
              userId: user.userId,
              userName: profile.displayName.toLowerCase().replace(/\s/g, ""),
            },
          });
        }

        // Fetch the profile to get the userName
        const userProfile = await prisma.profiles.findUnique({
          where: { userId: user.userId },
        });

        // Combine the user and profile data
        const userWithProfile = {
          ...user,
          userName: userProfile?.userName || profile.displayName,
        };

        return done(null, {
          success: true,
          user: userWithProfile,
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
