import {Box, Icon, Text} from "@chakra-ui/react"
import {motion} from "framer-motion"
import {FaCheckCircle, FaHeart, FaHeartBroken, FaStar} from "react-icons/fa"
import {useState, useEffect} from "react"
import Confetti from "react-confetti"
import {FormattedMessage} from "react-intl"

const MEGA_CONFETTI_COLORS = [
  "#e8d4b8",
  "#d4b88a",
  "#c09c5c",
  "#ac802e",
  "#8b6419",
  "#cc6600",
  "#fcd34d",
  "#fbbf24",
  "#f59e0b",
  "#eab308",
  "#d97706",
  "#b45309",
]

interface AnswerFeedbackProps {
  correct: boolean
  speciesFrequency?: string | null
  onAnimationComplete: () => void
}

const FEEDBACK_MS = 2000
const VAGRANT_FEEDBACK_MS = 2800

export function isVagrantMega(correct: boolean, speciesFrequency?: string | null): boolean {
  return correct && speciesFrequency === "vagrant"
}

export const AnswerFeedback = ({
                                 correct,
                                 speciesFrequency,
                                 onAnimationComplete,
                               }: AnswerFeedbackProps) => {
  const [heartState, setHeartState] = useState<"whole" | "broken">("whole")
  const [windowSize, setWindowSize] = useState({width: 0, height: 0})
  const vagrantMega = isVagrantMega(correct, speciesFrequency)
  const duration = vagrantMega ? VAGRANT_FEEDBACK_MS : FEEDBACK_MS

  useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => {
      setWindowSize({width: window.innerWidth, height: window.innerHeight})
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    if (!correct) {
      const interval = setInterval(() => {
        setHeartState("broken")
      }, 700)

      const done = setTimeout(() => {
        clearInterval(interval)
        setHeartState("whole")
        onAnimationComplete()
      }, duration)

      return () => {
        clearInterval(interval)
        clearTimeout(done)
      }
    }

    const done = setTimeout(onAnimationComplete, duration)
    return () => clearTimeout(done)
  }, [correct, duration, onAnimationComplete])

  return (
    <>
      {vagrantMega && windowSize.width > 0 && (
        <Box
          position="fixed"
          inset={0}
          zIndex={999}
          pointerEvents="none"
          aria-hidden
        >
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            run={vagrantMega}
            recycle={false}
            numberOfPieces={140}
            initialVelocityY={20}
            initialVelocityX={10}
            gravity={0.32}
            friction={0.97}
            tweenDuration={8}
            colors={MEGA_CONFETTI_COLORS}
          />
        </Box>
      )}
    <Box
      position="absolute"
      inset={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={20}
      pointerEvents="none"
    >
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        style={{position: "relative", zIndex: 2}}
      >
        {correct ? (
          <motion.div
            initial={{scale: 0, y: -100}}
            animate={{
              scale: vagrantMega ? [0, 1.35, 1.15] : [0, 1.2, 1],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 0.55,
              times: [0, 0.35, 1],
              ease: "easeOut",
            }}
          >
            <Box
              position="relative"
              textShadow="0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              backgroundColor="white"
              borderRadius={vagrantMega ? "xl" : "50%"}
              borderWidth={vagrantMega ? "2px" : undefined}
              borderColor={vagrantMega ? "#fcd34d" : undefined}
              p={vagrantMega ? 6 : 4}
              minW={vagrantMega ? "140px" : undefined}
            >
              {vagrantMega ? (
                <>
                  <Icon
                    as={FaStar}
                    boxSize={11}
                    color="#eab308"
                    position="relative"
                    zIndex={2}
                  />
                  <Text
                    fontSize="xl"
                    fontWeight="900"
                    letterSpacing="wider"
                    color="#b45309"
                    mt={2}
                  >
                    <FormattedMessage id="mega" defaultMessage="MEGA!" />
                  </Text>
                </>
              ) : (
                <Icon
                  as={FaCheckCircle}
                  boxSize={32}
                  color="success.500"
                  position="relative"
                  zIndex={2}
                />
              )}
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
              ease: "easeInOut",
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
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                bottom: "2px",
                borderRadius: "50%",
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))",
                zIndex: 1,
              }}
            >
              <Icon
                as={heartState === "whole" ? FaHeart : FaHeartBroken}
                boxSize={32}
                color="error.600"
                position="relative"
                zIndex={2}
              />
            </Box>
          </motion.div>
        )}
      </motion.div>
    </Box>
    </>
  )
}
