'use client';

import { motion } from 'framer-motion';

/**
 * Animated Package/Box Icon for "Total órdenes"
 * Features: floating box with lid bounce and sparkle effects
 */
export function AnimatedPackageIcon({ size = 56 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="initial"
      animate="animate"
      style={{ overflow: 'visible' }}
    >
      {/* Grupo flotante - todo se mueve junto */}
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Box body */}
        <rect
          x="12"
          y="30"
          width="40"
          height="24"
          rx="3"
          fill="#3B82F6"
          stroke="#2563EB"
          strokeWidth="1.5"
        />

        {/* Box front face detail (darker top strip) */}
        <rect
          x="12"
          y="30"
          width="40"
          height="5"
          fill="#2563EB"
        />

        {/* Vertical tape */}
        <rect
          x="29"
          y="30"
          width="6"
          height="24"
          fill="#60A5FA"
          opacity={0.5}
        />

        {/* Lid left - solo rotación, sin translación */}
        <motion.path
          d="M12 30 L12 25 Q12 22 15 22 L32 22 L32 30 Z"
          fill="#60A5FA"
          stroke="#2563EB"
          strokeWidth="1.5"
          animate={{ rotate: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '32px 30px' }}
        />

        {/* Lid right - solo rotación, sin translación */}
        <motion.path
          d="M32 30 L32 22 L49 22 Q52 22 52 25 L52 30 Z"
          fill="#60A5FA"
          stroke="#2563EB"
          strokeWidth="1.5"
          animate={{ rotate: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '32px 30px' }}
        />
      </motion.g>

      {/* Sparkle top-right */}
      <motion.circle
        cx="52"
        cy="14"
        r="2"
        fill="#FBBF24"
        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Sparkle top-left */}
      <motion.circle
        cx="14"
        cy="12"
        r="1.5"
        fill="#34D399"
        animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1, ease: 'easeInOut' }}
      />

      {/* Sparkle right cross */}
      <motion.path
        d="M58 24 L60 22 M58 22 L60 24"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}

/**
 * Animated Delivery Truck Icon for "En curso"
 * Features: truck driving with rotating wheels and bouncing cargo
 */
export function AnimatedTruckIcon({ size = 56 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Road line */}
      <motion.line
        x1="0"
        y1="52"
        x2="64"
        y2="52"
        stroke="#CBD5E1"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        animate={{
          strokeDashoffset: [0, -20],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Truck group - subtle bounce */}
      <motion.g
        animate={{
          y: [0, -1.5, 0, -0.5, 0],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Cargo/Trailer body */}
        <rect
          x="4"
          y="22"
          width="32"
          height="24"
          rx="2"
          fill="#818CF8"
          stroke="#6366F1"
          strokeWidth="1.5"
        />

        {/* Cargo stripes */}
        <rect x="10" y="22" width="2" height="24" fill="#6366F1" opacity={0.3} />
        <rect x="18" y="22" width="2" height="24" fill="#6366F1" opacity={0.3} />
        <rect x="26" y="22" width="2" height="24" fill="#6366F1" opacity={0.3} />

        {/* Cabin */}
        <path
          d="M36 30 L36 22 Q36 20 38 20 L48 20 Q52 20 54 24 L56 30 Q58 32 58 34 L58 46 L36 46 Z"
          fill="#A5B4FC"
          stroke="#6366F1"
          strokeWidth="1.5"
        />

        {/* Cabin window */}
        <path
          d="M40 24 L48 24 Q50 24 51 27 L52 30 L40 30 Z"
          fill="#DBEAFE"
          stroke="#6366F1"
          strokeWidth="1"
        />

        {/* Headlight */}
        <motion.rect
          x="55"
          y="36"
          width="3"
          height="4"
          rx="1"
          fill="#FBBF24"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.g>

      {/* Rear wheel */}
      <motion.g
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ originX: '16px', originY: '48px' }}
      >
        <circle cx="16" cy="48" r="5" fill="#374151" stroke="#1F2937" strokeWidth="1.5" />
        <circle cx="16" cy="48" r="2" fill="#6B7280" />
        <line x1="16" y1="43" x2="16" y2="45" stroke="#6B7280" strokeWidth="1" />
        <line x1="16" y1="51" x2="16" y2="53" stroke="#6B7280" strokeWidth="1" />
        <line x1="11" y1="48" x2="13" y2="48" stroke="#6B7280" strokeWidth="1" />
        <line x1="19" y1="48" x2="21" y2="48" stroke="#6B7280" strokeWidth="1" />
      </motion.g>

      {/* Front wheel */}
      <motion.g
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ originX: '46px', originY: '48px' }}
      >
        <circle cx="46" cy="48" r="5" fill="#374151" stroke="#1F2937" strokeWidth="1.5" />
        <circle cx="46" cy="48" r="2" fill="#6B7280" />
        <line x1="46" y1="43" x2="46" y2="45" stroke="#6B7280" strokeWidth="1" />
        <line x1="46" y1="51" x2="46" y2="53" stroke="#6B7280" strokeWidth="1" />
        <line x1="41" y1="48" x2="43" y2="48" stroke="#6B7280" strokeWidth="1" />
        <line x1="49" y1="48" x2="51" y2="48" stroke="#6B7280" strokeWidth="1" />
      </motion.g>

      {/* Exhaust smoke */}
      <motion.circle
        cx="2"
        cy="44"
        r="2.5"
        fill="#94A3B8"
        animate={{
          x: [-2, -10],
          y: [0, -6],
          opacity: [0.5, 0],
          scale: [0.5, 1.5],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.circle
        cx="2"
        cy="44"
        r="2"
        fill="#94A3B8"
        animate={{
          x: [-4, -14],
          y: [0, -8],
          opacity: [0.4, 0],
          scale: [0.4, 1.3],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: 0.4,
          ease: 'easeOut',
        }}
      />

      {/* Speed lines */}
      <motion.line
        x1="0"
        y1="30"
        x2="6"
        y2="30"
        stroke="#A5B4FC"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          x1: [0, -8],
          x2: [6, -2],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.line
        x1="0"
        y1="36"
        x2="4"
        y2="36"
        stroke="#A5B4FC"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          x1: [0, -6],
          x2: [4, -2],
          opacity: [0.5, 0],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          delay: 0.3,
          ease: 'easeOut',
        }}
      />
    </motion.svg>
  );
}

/**
 * Animated Check/Success Icon for "Completadas"
 * Features: circle draws in, then checkmark draws in, with sparkle burst
 */
export function AnimatedCheckIcon({ size = 56 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Background circle pulse */}
      <motion.circle
        cx="32"
        cy="32"
        r="26"
        fill="#D1FAE5"
        animate={{
          r: [24, 26, 24],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main circle */}
      <motion.circle
        cx="32"
        cy="32"
        r="22"
        fill="#10B981"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          ease: 'backOut',
        }}
      />

      {/* Inner circle highlight */}
      <motion.circle
        cx="28"
        cy="28"
        r="16"
        fill="#34D399"
        opacity={0.3}
      />

      {/* Checkmark */}
      <motion.path
        d="M20 33 L28 41 L44 24"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          ease: 'easeOut',
          repeat: Infinity,
          repeatDelay: 3,
        }}
      />

      {/* Sparkle particles */}
      <motion.circle
        cx="52"
        cy="12"
        r="2"
        fill="#34D399"
        animate={{
          scale: [0, 1.2, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.8,
          ease: 'easeInOut',
        }}
      />
      <motion.circle
        cx="10"
        cy="14"
        r="1.5"
        fill="#6EE7B7"
        animate={{
          scale: [0, 1.3, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 1.2,
          ease: 'easeInOut',
        }}
      />
      <motion.circle
        cx="54"
        cy="40"
        r="1.5"
        fill="#A7F3D0"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 1.5,
          ease: 'easeInOut',
        }}
      />

      {/* Star sparkle */}
      <motion.path
        d="M56 20 L57.5 17 L59 20 L56 18.5 L59 18.5 Z"
        fill="#FBBF24"
        animate={{
          scale: [0, 1.1, 0],
          opacity: [0, 1, 0],
          rotate: [0, 20, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 0.5,
          ease: 'easeInOut',
        }}
      />
    </motion.svg>
  );
}

/**
 * Animated Warning/Alert Icon for "Requieren atención"
 * Features: triangle with bounce, shaking exclamation, pulsing glow
 */
export function AnimatedWarningIcon({ size = 56 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Glow pulse behind triangle */}
      <motion.path
        d="M32 6 L60 56 L4 56 Z"
        fill="#FDE68A"
        animate={{ scale: [0.95, 1.06, 0.95], opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '32px 42px' }}
      />

      {/* Main group with subtle bounce */}
      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Triangle body */}
        <path
          d="M32 10 L58 54 L6 54 Z"
          fill="#F59E0B"
          stroke="#D97706"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Triangle inner highlight */}
        <path
          d="M32 18 L48 50 L16 50 Z"
          fill="#FBBF24"
          opacity={0.35}
        />

        {/* Exclamation mark body */}
        <motion.rect
          x="29.5"
          y="24"
          width="5"
          height="16"
          rx="2.5"
          fill="white"
          animate={{ rotate: [0, -3, 0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '32px 32px' }}
        />

        {/* Exclamation dot */}
        <motion.circle
          cx="32"
          cy="45"
          r="2.8"
          fill="white"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Alert wave left */}
      <motion.path
        d="M8 28 Q4 32 8 36"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={{ x: [-2, 0, -2], opacity: [0, 0.7, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Alert wave right */}
      <motion.path
        d="M56 28 Q60 32 56 36"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={{ x: [2, 0, 2], opacity: [0, 0.7, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
      />

      {/* Attention dot top-left */}
      <motion.circle
        cx="8"
        cy="16"
        r="1.5"
        fill="#FBBF24"
        animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Attention dot top-right */}
      <motion.circle
        cx="56"
        cy="14"
        r="1.5"
        fill="#FBBF24"
        animate={{ scale: [0, 1.2, 0], opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 1, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}
