// import 'bulma'
// import './App.module.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { onMount, onCleanup } from 'solid-js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const $ = id => document.querySelector(id)

const colors = ['#41B3A3', '#C38D9E', '#E8A87C', '#85DCB0', '#E27D60', '#659DBD', '#DAAD86', '#FBEEC1', '#5CDB95', '#97CAEF', '#AFD275', '#FF6347', 
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'
]

const loadModel = modelPath => new Promise((resolve, reject) => 
   new GLTFLoader().load(modelPath, gltf => resolve(gltf.scene), undefined, reject)
)

const createRenderer = canvas => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })    
  renderer.shadowMap.enabled = true
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)
  return renderer
}

const createCamera = () => {
  const cameraFar = 5
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = cameraFar
  camera.position.x = 0
  return camera
}

const createSkyBox = (renderer, scene) => {
  const sky = new Sky()
  sky.scale.setScalar( 10000 )

  const skyUniforms = sky.material.uniforms

  skyUniforms[ 'turbidity' ].value = 10
  skyUniforms[ 'rayleigh' ].value = 2
  skyUniforms[ 'mieCoefficient' ].value = 0.005
  skyUniforms[ 'mieDirectionalG' ].value = 0.8
  const parameters = {
    elevation: 0,
    azimuth: 250
  }

  const pmremGenerator = new THREE.PMREMGenerator( renderer )
  const sun = new THREE.Vector3()

  function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation )
    const theta = THREE.MathUtils.degToRad( parameters.azimuth )

    sun.setFromSphericalCoords( 1, phi, theta )

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun )
    // water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize()

    scene.environment = pmremGenerator.fromScene( sky ).texture

  }

  updateSun()
  return sky
}

const createScene = () => {
  const BACKGROUND_COLOR = 0xf1f1f1
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND_COLOR)
  scene.fog = new THREE.Fog(BACKGROUND_COLOR, 20, 100)
  return scene
}

const prepareModel = theModel => {
  theModel.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  
  // Set the models initial scale   
  theModel.scale.set(2, 2, 2)
  theModel.rotation.y = Math.PI

  // Offset the y position a bit
  theModel.position.y = -1
  const countDepth = part => 1 + (part.parent && countDepth(part.parent) || 0)
  // const components = theModel.children[0].children.map(child => child.name)
  

  const paintChildren = (root, depth, hovered) => {
    root.old_material = root.old_material || root.material
    root.material = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF
    })
    root.material.transparent = true
    root.material.opacity = 0.1
    root.material.metalness = 0
    root.material.wireframe = !hovered
    if (hovered) {
      root.material = root.old_material

      // root.material.flatShading = true
      // root.material.specular = 0x333333
      // root.material.shininess = 60

      // root.material.emissive.setHex(0x111111)
    }
    root.children.map(child => paintChildren(child, depth + 1, hovered))
  }

  const traverseChildren = (root, depth=0) => {
    const div = document.createElement('div')
    div.setAttribute('class', 'opt')
    div.appendChild(document.createTextNode(root.name))

    let box = $('.options').children[depth]
    if (!box) {
      box = document.createElement('div')
      box.style.width = 'auto'
      box.style.height = '120px'
      box.style.background = colors[depth]
      box.style.overflowY = 'scroll'
      $('.options').appendChild(box)
    }
    box.appendChild(div)


    div.onmouseover = e => {
        div.setAttribute('class', 'opt active')
        let parent = root.parent
        for (let i = 0; i < depth; i++) {
          parent = parent.parent
        }
        paintChildren(parent, depth, false)
        paintChildren(root, depth, true)

        while (box.nextElementSibling) {
          box.nextElementSibling.remove()
        }
        for (const child of e.currentTarget.parentElement.children) {
          if (child.classList.contains('active') && child.parentElement === e.currentTarget.parentElement) {
            child.classList.remove('active')
          }
        }
        e.currentTarget.classList.add('active')

        for (const child of root.children) {
          traverseChildren(child, depth + 1)
        }

    }
    // div.onmouseleave = e => {
    //   // div.setAttribute('class', 'opt')
    //   // root.material.emissive.setHex(0xcccccc)
    // }
  }
  traverseChildren(theModel.children[0])
}

const createLights = () => {                            //0x444444
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61)
    hemiLight.position.set(0, 50 /* 300 */, 0)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.54)
    dirLight.position.set(-8, 12, 8) // 75, 300, -75 
    dirLight.castShadow = true
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
    
    return [hemiLight, dirLight]
}

const createFloor = () => {
  const floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1)
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 0 })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -0.5 * Math.PI
  floor.receiveShadow = true
  floor.position.y = -1
  return floor
}

const enableControls = (canvas, camera) => {
   const controls = new OrbitControls(camera, canvas)
   controls.maxPolarAngle = Math.PI * 0.495
   controls.minPolarAngle = Math.PI / 3
   controls.enableDamping = true
   controls.enablePan = false
   controls.dampingFactor = 0.1
   controls.autoRotate = false
   controls.autoRotateSpeed = 0.2 // 30
   controls.target.set( 0, -0.8, 0 )
   controls.minDistance = 0.1
   controls.maxDistance = 2.0
   return controls
}

function resizeRendererToDisplaySize(renderer, camera) {
  const canvas = renderer.domElement
  const width = window.innerWidth
  const height = window.innerHeight
  const canvasPixelWidth = canvas.width / window.devicePixelRatio
  const canvasPixelHeight = canvas.height / window.devicePixelRatio

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height
  if (needResize) {
    renderer.setSize(width, height, false)
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }
}

function dragToRotate(theModel, initRotate = 0) {
  if (!initRotate) {
    $('#js-loader').remove()
    $('#js-drag-notice').classList.add('start')
  }
  if (++initRotate <= 120) {
    theModel.rotation.y += Math.PI / 60
    setTimeout(() => dragToRotate(theModel, initRotate), 20)
  } else {
    $('#js-drag-notice').classList.remove('start')
    setTimeout(() => $('#js-drag-notice').classList.add('stop'), 800)      
  }
}

const setupInterface = theModel => {
  theModel.rotation.y += Math.PI
  $('#js-loader').remove()
  $('#js-drag-notice').remove()
  // dragToRotate(theModel)
}

const loadCanvas = async canvas => {

  // const colors = await (await fetch('/src/colors.json')).json()

  const renderer = createRenderer(canvas)
  const camera = createCamera()
  const controls = enableControls(canvas, camera)

  const floor = createFloor()
  const lights = createLights()
  const theModel = await loadModel('/positron_32b_v57.glb')
  prepareModel(theModel)

  const scene = createScene()
  const sky = createSkyBox(renderer, scene)


  scene.add(floor, ...lights, theModel, sky)

  setupInterface(theModel)
 
  // const raycaster = new THREE.Raycaster()
  // const mouse = new THREE.Vector2()
  // let INTERSECTED


  // document.addEventListener("mousemove", onDocumentMouseMove, false)
  
  // function onDocumentMouseMove(event) {
  //   event.preventDefault()
    
  //   mouse.x = event.clientX / window.innerWidth * 2 - 1
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  // }
  const animate = () => {
    controls.update()
    resizeRendererToDisplaySize(renderer, camera)
    // // raycaster
    // raycaster.setFromCamera(mouse, camera)

    // var intersects = raycaster.intersectObjects(scene.children, true)

    // if (intersects.length > 0) {
    //   if (INTERSECTED != intersects[0].object) {
    //     INTERSECTED && INTERSECTED.currentHex && INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex)

    //     INTERSECTED = intersects[0].object

    //     if (INTERSECTED.name !== "") {
    //       INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex()
    //       INTERSECTED.material.emissive.setHex(0xff0000)
    //     }
    //   }
    // } else {
    //   if (INTERSECTED)
    //     INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex)

    //   INTERSECTED = null
    // }



    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
}

export default () => {

  return (
    <div class='App'>
      <div class="loading" id="js-loader">
          <div class="loader"></div>
      </div>
      <span class="drag-notice" id="js-drag-notice">Drag to rotate 360&#176;</span>
      <div class="options">
      </div>
      <canvas id='c' ref={loadCanvas} />
      <div class="controls">
          <div class="info">
              <div class="info__message">
                  <p><strong>&nbsp;Grab&nbsp;</strong> to rotate chair. <strong>&nbsp;Scroll&nbsp;</strong> to zoom. <strong>&nbsp;Drag&nbsp;</strong> swatches to view more.</p>
              </div>
          </div>
      </div>
    </div>
  )
}
