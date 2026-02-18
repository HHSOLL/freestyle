import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import Image from 'next/image';
import type { CommunityPost, CommunityTranslator } from '../types';

type CommunityPostCardProps = {
  t: CommunityTranslator;
  post: CommunityPost;
  index: number;
};

export function CommunityPostCard({ t, post, index }: CommunityPostCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="bg-[#fafafa] border border-black/5 rounded-[24px] md:rounded-[32px] lg:rounded-[40px] overflow-hidden transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]">
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
          <Image
            src={post.image}
            alt={t('community.alt.look')}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-10">
            <div className="flex gap-4 items-center">
              {post.tagKeys.map((tagKey) => (
                <span
                  key={tagKey}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-bold text-white uppercase tracking-widest"
                >
                  #{t(tagKey)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 border border-black/5" />
              <div className="flex flex-col">
                <span className="text-[13px] font-black tracking-tight">{post.user}</span>
                <span className="text-[10px] text-black/30 font-bold uppercase tracking-widest">
                  {t('community.contributor')}
                </span>
              </div>
            </div>
            <button className="text-[10px] font-black tracking-widest uppercase px-5 py-2 border border-black/10 rounded-full hover:bg-black hover:text-white transition-all">
              {t('community.follow')}
            </button>
          </div>

          <div className="flex items-center gap-10 text-black/60 pt-4 border-t border-black/5">
            <button className="flex items-center gap-2 group/btn">
              <Heart className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
              <span className="text-[11px] font-black tracking-widest uppercase">{post.likes}</span>
            </button>
            <button className="flex items-center gap-2 group/btn">
              <MessageCircle className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
              <span className="text-[11px] font-black tracking-widest uppercase">{post.comments}</span>
            </button>
            <button className="ml-auto group/btn">
              <Share2 className="w-5 h-5 transition-transform group-hover/btn:rotate-12" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
