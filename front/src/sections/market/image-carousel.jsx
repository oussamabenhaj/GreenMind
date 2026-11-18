import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { ProductCover } from '../seller/components/product-card';

// ----------------------------------------------------------------------

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0.4 }),
};

/** Swipeable carousel (drag, arrows, dots). Falls back to the category cover when there is no photo. */
export function ImageCarousel({ product, height = 420, onOpen }) {
  const images = product.images ?? [];
  const [[index, dir], setState] = useState([0, 0]);
  const go = (delta) => setState(([i]) => [(i + delta + images.length) % images.length, delta]);

  if (images.length === 0) {
    return (
      <Box onClick={onOpen} sx={{ cursor: onOpen ? 'pointer' : 'default' }}>
        <ProductCover product={product} height={height * 0.7} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        overflow: 'hidden',
        bgcolor: 'grey.900',
        userSelect: 'none',
        '&:hover .carousel-arrow': { opacity: 1 },
      }}
    >
      <AnimatePresence initial={false} custom={dir}>
        <Box
          key={images[index]}
          component={m.img}
          src={images[index]}
          alt={product.title}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          drag={images.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(1);
            else if (info.offset.x > 60) go(-1);
          }}
          onClick={onOpen}
          draggable={false}
          sx={{ position: 'absolute', inset: 0, width: 1, height: 1, objectFit: 'cover', cursor: images.length > 1 ? 'grab' : 'pointer', '&:active': { cursor: 'grabbing' } }}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          {[
            [-1, 'eva:arrow-ios-back-fill', { left: 12 }],
            [1, 'eva:arrow-ios-forward-fill', { right: 12 }],
          ].map(([delta, icon, pos]) => (
            <IconButton
              key={delta}
              className="carousel-arrow"
              onClick={(e) => {
                e.stopPropagation();
                go(delta);
              }}
              sx={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                ...pos,
                opacity: { xs: 1, md: 0 },
                transition: 'opacity .2s',
                bgcolor: 'rgba(255,255,255,0.85)',
                '&:hover': { bgcolor: 'common.white' },
              }}
            >
              <Iconify icon={icon} />
            </IconButton>
          ))}
          <Box sx={{ position: 'absolute', top: 12, right: 12, px: 1.25, py: 0.25, borderRadius: 5, bgcolor: 'rgba(0,0,0,0.55)', color: 'common.white', typography: 'caption', fontWeight: 600 }}>
            {index + 1}/{images.length}
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', bottom: 12, left: 0, right: 0, justifyContent: 'center' }}>
            {images.map((src, i) => (
              <Box
                key={src}
                onClick={(e) => {
                  e.stopPropagation();
                  setState([i, i > index ? 1 : -1]);
                }}
                sx={{
                  height: 8,
                  width: i === index ? 22 : 8,
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all .3s',
                  bgcolor: i === index ? 'common.white' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
