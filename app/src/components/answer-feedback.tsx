import { Box, Icon } from "@chakra-ui/react"
import { motion } from "framer-motion"
import { FaCheckCircle, FaHeart, FaHeartBroken } from "react-icons/fa"
import { useState, useEffect } from "react"

interface AnswerFeedbackProps {
  correct: boolean
  onAnimationComplete: () => void
}

export const AnswerFeedback = ({ correct, onAnimationComplete }: AnswerFeedbackProps) => {
  const [heartState, setHeartState] = useState<'whole' | 'broken'>('whole')

  useEffect(() => {
    if (!correct) {
      // Toggle heart state for incorrect answers
      const interval = setInterval(() => {
        setHeartState('broken')
      }, 700)

      // Cleanup and trigger callback
      setTimeout(() => {
        clearInterval(interval)
        setHeartState('whole')
        onAnimationComplete()
      }, 2000)
    } else {
      // Just wait and trigger callback for correct answers
      setTimeout(() => {
        onAnimationComplete()
      }, 2000)
    }
  }, [correct, onAnimationComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 150,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {correct ? (
        <motion.div
          initial={{ scale: 0, y: -100 }}
          animate={{ 
            scale: [0, 1.2, 1],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 0.5,
            times: [0, 0.3, 1],
            ease: "easeOut"
          }}
        >
          <Box
            position="relative"
            width="160px"
            height="160px"
            borderRadius="50%"
            bg="white"
            boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            _before={{
              content: '""',
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
              zIndex: 1
            }}
          >
            <Icon
              as={FaCheckCircle}
              boxSize={32}
              color="orange.600"
              position="relative"
              zIndex={2}
            />
          </Box>
        </motion.div>
      ) : (
        <motion.div
          animate={{ 
            x: [0, 20, -20, 20, -20, 0],
            rotate: [0, 10, -10, 10, 0, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: 2,
            ease: "easeInOut"
          }}
        >
          <Box
            position="relative"
            width="160px"
            height="160px"
            borderRadius="50%"
            bg="white"
            boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            _before={{
              content: '""',
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
              zIndex: 1
            }}
          >
            <Icon
              as={heartState === 'whole' ? FaHeart : FaHeartBroken}
              boxSize={32}
              color="orange.600"
              position="relative"
              zIndex={2}
            />
          </Box>
        </motion.div>
      )}
    </motion.div>
  )
} 