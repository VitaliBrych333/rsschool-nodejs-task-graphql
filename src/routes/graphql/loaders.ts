import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';
import { Static } from '@sinclair/typebox';
import { profileSchema } from '../profiles/schemas.js';
import { postSchema } from '../posts/schemas.js';

export function getLoaders(prisma: PrismaClient) {
  return {
    profile: new DataLoader(async (userIDs: readonly string[]) => {
      const profilesMap = new Map<string, Static<typeof profileSchema>>();
      const profiles = await prisma.profile.findMany({ where: { userId: { in: [...userIDs] }}});

      profiles.forEach((profile) => profilesMap.set(profile.userId, profile));

      return userIDs.map((id) => profilesMap.get(id));
    }),

    posts: new DataLoader(async (userIDs: readonly string[]) => {
      const posts = await prisma.post.findMany({ where: { authorId: { in: [...userIDs] }}});
      const postMap = new Map<string, Static<typeof postSchema>[]>();

      posts.forEach((post) => {
        const author = postMap.get(post.authorId);
        author 
          ? author.push(post)
          : postMap.set(post.authorId, [post]);
        });

        return userIDs.map((key) => postMap.get(key) ?? null);
      }),

      memberType: new DataLoader(async (memberTypeIDs: readonly string[]) => {
        const members = await prisma.memberType.findMany({ where: { id: { in: [...memberTypeIDs] }}});
        return memberTypeIDs.map((id) => members.find((memberType) => memberType.id === id));
      }),

      userSubscribedTo: new DataLoader(async (userIDs: readonly string[]) => {
        const usersAuthors = await prisma.user.findMany({
          where: { id: { in: Array.from(userIDs) } },
          include: { userSubscribedTo: { select: { author: true } } },
        });
      const subscribedAuthorsMap = new Map<string, { id: string; name: string }[]>();

      usersAuthors.forEach((user) => {
        const subscribedAuthors = user.userSubscribedTo.map((subscription) => subscription.author);
        subscribedAuthorsMap.set(user.id, subscribedAuthors);
      });

      return userIDs.map((id) => subscribedAuthorsMap.get(id));
    }),

    subscribedToUser: new DataLoader(async (userIDs: readonly string[]) => {
      const usersSubs = await prisma.user.findMany({
        where: { id: { in: Array.from(userIDs) } },
        include: { subscribedToUser: { select: { subscriber: true }}}
      });
      const subscribersMap = new Map<string, { id: string; name: string }[]>();

      usersSubs.forEach((user) => {
        if (!subscribersMap.get(user.id)) {
          subscribersMap.set(user.id, []);
        }

        subscribersMap.get(user.id)?.push(...user.subscribedToUser.map((sub) => sub.subscriber));
      });

      return userIDs.map((id) => subscribersMap.get(id));
    })
  }
}