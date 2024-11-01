import { GraphQLList, GraphQLObjectType } from 'graphql';
import { ResolveTree, simplifyParsedResolveInfoFragmentWithType, parseResolveInfo } from 'graphql-parse-resolve-info';
import { User } from '@prisma/client';
import { UUIDType } from './types/uuid.js';
import { MemberIdType, MemberType, PostType, ProfileType, UserType } from './types/types.js';

export const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    users: {
      type: new GraphQLList(UserType),
      resolve: async (_, _args, { prisma, dataLoader }, _info) => {

        const { fields } = simplifyParsedResolveInfoFragmentWithType(parseResolveInfo(_info) as ResolveTree, new GraphQLList(UserType));
        const includeUserSubscribedTo = 'userSubscribedTo' in fields;
        const includeSubscribedToUser = 'subscribedToUser' in fields;

        const users = await prisma.user.findMany({
          include: { userSubscribedTo: includeUserSubscribedTo, subscribedToUser: includeSubscribedToUser }
        });

        if (includeSubscribedToUser || includeUserSubscribedTo) {
          const usersSet = new Set<User>();
          users.forEach((i: any) => usersSet.add(i));

          users.forEach((user: any) => {
            if (includeUserSubscribedTo) {
              dataLoader.userSubscribedTo.prime(
                user.id,
                user.userSubscribedTo.map((i: any) => Array.from(usersSet.values())
                                      .find(j => j.id === i.authorId) as User));
            }

            if (includeSubscribedToUser) {
              dataLoader.subscribedToUser.prime(
                user.id,
                user.subscribedToUser.map((i: any) => Array.from(usersSet.values())
                                     .find(j => j.id === i.subscriberId) as User));
            }
          });
        }
    
        return users;
      }
    },
        
    posts: {
      type: new GraphQLList(PostType),
      resolve: async (_, _args, { prisma }) => await prisma.post.findMany()
    },

    memberTypes: {
      type: new GraphQLList(MemberType),
      resolve: async (_, _args, { prisma }) => await prisma.memberType.findMany()
    },

    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: async (_, _args, { prisma }) => await prisma.profile.findMany()
    },

    user: {
      type: UserType,
      args: { id: { type: UUIDType } },
      resolve: async (_, { id }, { prisma }, _info) => await prisma.user.findUnique({ where: { id }})
    },

    post: {
      type: PostType,
      args: { id: { type: UUIDType } },
      resolve: async (_, { id }, { prisma }, _info) => await prisma.post.findUnique({ where: { id }})
    },

    memberType: {
      type: MemberType,
      args: { id: { type: MemberIdType } },
      resolve: async (_, { id }, { prisma }, _info) => await prisma.memberType.findUnique({ where: { id }})
    },

    profile: {
      type: ProfileType,
      args: { id: { type: UUIDType } },
      resolve: async (_, { id }, { prisma }, _info) => await prisma.profile.findUnique({ where: { id }})
    }
  }
})
