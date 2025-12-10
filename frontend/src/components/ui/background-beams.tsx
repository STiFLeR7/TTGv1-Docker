import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BackgroundBeams = ({ className }: { className?: string }) => {
    // Configuration for the beams
    const beams = [
        { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
        { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
        { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: "h-6" },
        { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
        { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: "h-20" },
        { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: "h-12" },
        { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2 },
    ];

    return (
        <div className={cn("absolute h-full w-full inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,white,transparent)]", className)}>
            {beams.map((beam, idx) => (
                <CollisionBeam key={idx} {...beam} />
            ))}
        </div>
    );
};

const CollisionBeam = ({ initialX, duration, repeatDelay, delay, className }: any) => {
    return (
        <motion.div
            initial={{ translateY: "-200px", translateX: initialX, opacity: 0 }}
            animate={{ translateY: "150vh", opacity: 1 }}
            transition={{
                duration: duration,
                repeat: Infinity,
                repeatDelay: repeatDelay,
                delay: delay,
                ease: "linear",
            }}
            className={cn(
                "absolute left-0 top-0 m-auto h-14 w-px rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-transparent",
                className
            )}
        />
    );
};