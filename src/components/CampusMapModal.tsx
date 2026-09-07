import { useState } from 'react'
import { Button, Modal } from '@heroui/react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { FitIcon, MinusIcon, PlusIcon, XIcon } from './icons'

type CampusMapModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function CampusMapModal({ isOpen, onClose }: CampusMapModalProps) {
  const [scale, setScale] = useState(1)

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="full" scroll="inside">
          <Modal.Dialog className="campus-dialog">
            <div className="campus-close-wrapper">
              <Button isIconOnly variant="flat" size="sm" onPress={onClose} aria-label="关闭">
                <XIcon size={20} />
              </Button>
            </div>
            <Modal.Body className="campus-body">
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                centerOnInit
                limitToBounds={false}
                doubleClick={{ mode: 'zoomIn', disabled: false }}
                pinch={{ disabled: false }}
                panning={{ disabled: false }}
                wheel={{ step: 0.14 }}
                onTransformed={(_ref, state) => setScale(state.scale)}
              >
                {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                  <div className="campus-stage" role="img" aria-label="校园地图">
                    <TransformComponent wrapperClass="campus-transform" contentClass="campus-transform-content">
                      <img className="campus-image" src="/map.jpg" alt="" draggable={false} />
                    </TransformComponent>

                    <div className="campus-zoom-level">{Math.round(scale * 100)}%</div>

                    <div className="campus-controls" aria-label="缩放控制">
                      <button className="campus-control-btn" aria-label="缩小" onPress={() => zoomOut(0.4, 180)}>
                        <MinusIcon size={18} />
                      </button>
                      <button className="campus-control-btn" aria-label="适应" onPress={() => { resetTransform(180); centerView(1, 180) }}>
                        <FitIcon size={18} />
                      </button>
                      <button className="campus-control-btn" aria-label="放大" onPress={() => zoomIn(0.4, 180)}>
                        <PlusIcon size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </TransformWrapper>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
